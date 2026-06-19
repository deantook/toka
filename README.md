# Toka

Toka 是一款基于 Tauri 的滴答清单桌面应用——**用说的，管清单**。内置 Agent 运行时，通过 HTTP MCP 对接滴答清单，说出今天的事，即可帮你理清、安排、复盘任务与日程。

## 前置要求

- **Node.js** 20+
- **pnpm**
- **Rust**（用于 Tauri 桌面壳构建）

## 配置说明

首次使用前，请在应用内 **设置** 页填写以下信息（也可通过 Agent sidecar 的环境变量注入，见下文）。

### 滴答 Token

1. 登录 [滴答清单](https://dida365.com)，进入 **设置 → 开发者**（或开发者设置）。
2. 创建或复制 API Token，格式为 `dp_...`。
3. 在 Toka 设置页的 **滴答 Token** 字段粘贴该 Token。

Sidecar 环境变量：`DIDA365_TOKEN`（可选 `DIDA365_MCP_URL`，默认 `https://mcp.dida365.com`）。

### LLM API

Toka 使用 OpenAI 兼容 API 驱动 Agent 对话与工具调用。在设置页配置：

| 字段 | 说明 | 默认值 |
|------|------|--------|
| LLM Base URL | API 端点 | `https://api.openai.com/v1` |
| LLM Model | 模型名称 | 如 `gpt-4o-mini` |
| LLM API Key | API 密钥 | `sk-...` |

Sidecar 环境变量：`LLM_BASE_URL`、`LLM_MODEL`、`LLM_API_KEY`。

凭证保存在本地 `settings.json` 中，不会上传至第三方。

## 开发命令

在仓库根目录执行：

```bash
# 安装依赖
pnpm install

# 启动 Tauri 桌面应用（同时拉起 Agent sidecar）
pnpm dev

# 仅启动 Agent sidecar（监听 127.0.0.1:17200）
pnpm agent:dev

# 运行单元测试
pnpm test
```

构建 sidecar 产物：

```bash
pnpm agent:build
```

Sidecar 端口可通过环境变量 `TOKA_AGENT_PORT` 覆盖（默认 `17200`）。

健康检查：

```bash
curl -s http://127.0.0.1:17200/health
# 期望: {"status":"ok","port":17200}
```

## 架构概览

Monorepo 分层结构：

```
toka/
├── apps/desktop/              # Tauri + React 前端（Chat、Schedule、Settings）
├── packages/agent-core/       # MCP 客户端、Context Engine、DomainRules
├── packages/agent-roles/      # 四角色 prompt 与工具策略
└── packages/agent-runtime/    # LLM client、tool loop、Pipeline、HTTP/SSE sidecar
```

数据流简述：桌面 UI 通过 SSE/REST 连接 `agent-runtime` sidecar → Pipeline 按意图路由四角色 → `agent-core` 按需拉取滴答上下文并调用 MCP → 结果汇总为中文回复与变更清单。

详细设计见 [docs/superpowers/specs/2026-06-20-toka-agent-design.md](docs/superpowers/specs/2026-06-20-toka-agent-design.md)。

## 验证

```bash
pnpm test
cd apps/desktop && pnpm exec tsc --noEmit
curl -s http://127.0.0.1:17200/health || echo "sidecar not running (ok if not started)"
```

## 发布

推送到 `main` 分支后，GitHub Actions 会自动构建 macOS（Apple Silicon / Intel）与 Windows 安装包，并更新对应版本的 GitHub Release（版本号取自 `tauri.conf.json`）。

也可在 GitHub 仓库 **Actions → Release → Run workflow** 手动触发。

产物包括：

| 平台 | 格式 |
|------|------|
| macOS (Apple Silicon) | `.dmg`、`.app.tar.gz` |
| macOS (Intel) | `.dmg`、`.app.tar.gz` |
| Windows | `.msi`、`.exe` |

安装包未做代码签名：macOS 首次打开需在 **系统设置 → 隐私与安全性** 中允许；Windows 可能弹出 SmartScreen 提示。
