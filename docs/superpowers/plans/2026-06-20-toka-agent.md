# Toka 滴答清单 Agent 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从零搭建 Toka — Tauri 桌面应用 + 分层 Agent sidecar，通过滴答 MCP 实现四角色（分析/规划/日程/回顾）任务管理。

**Architecture:** pnpm monorepo 分三包（`agent-core` / `agent-roles` / `agent-runtime`）+ `apps/desktop`。请求经 Pipeline（Understand → Context → Plan → Execute → Summarize）处理；写操作自动执行无确认。

**Tech Stack:** Tauri 2, React 19, Vite 7, TypeScript, Hono, OpenAI SDK, MCP HTTP SDK, Tailwind 4, pnpm workspace

**参考实现（只读）：** `/Users/dean/code/rick` — MCP client、server、Tauri sidecar 模式

**开放问题已锁定：**
- Sidecar 端口：`17200`（`TOKa_AGENT_PORT`）
- 对话持久化：内存 `MemoryConversationStore`（MVP）
- LLM 模型：设置页留空，用户自填

---

## 文件结构总览

| 路径 | 职责 |
|------|------|
| `package.json` | workspace 根脚本 |
| `pnpm-workspace.yaml` | packages + apps |
| `packages/agent-core/src/types.ts` | 共享类型 |
| `packages/agent-core/src/datetime.ts` | 时区/日期工具 |
| `packages/agent-core/src/mcp/client.ts` | Dida365 MCP HTTP 客户端 |
| `packages/agent-core/src/mcp/normalize.ts` | MCP 响应规范化 |
| `packages/agent-core/src/mcp/task-fetch.ts` | 分段拉取日期范围任务 |
| `packages/agent-core/src/context/engine.ts` | ContextEngine + 60s 缓存 |
| `packages/agent-core/src/rules/domain.ts` | DomainRules 文本 |
| `packages/agent-roles/src/prompts/*.ts` | 四角色 + analyzer prompt |
| `packages/agent-roles/src/tools.ts` | role → 工具名映射 |
| `packages/agent-roles/src/compose.ts` | 组装 system prompt |
| `packages/agent-runtime/src/llm/client.ts` | OpenAI 兼容 client |
| `packages/agent-runtime/src/llm/tool-loop.ts` | tool-calling 循环 |
| `packages/agent-runtime/src/pipeline/analyzer.ts` | 意图分析 |
| `packages/agent-runtime/src/pipeline/pipeline.ts` | AgentPipeline |
| `packages/agent-runtime/src/store/memory.ts` | 内存对话存储 |
| `packages/agent-runtime/src/server.ts` | Hono HTTP/SSE |
| `apps/desktop/` | Tauri + React UI |

---

### Task 1: Monorepo 脚手架

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `tsconfig.base.json`

- [ ] **Step 1: 创建根 package.json**

```json
{
  "name": "toka",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "pnpm --filter @toka/desktop tauri dev",
    "build": "pnpm --filter @toka/desktop build",
    "agent:dev": "pnpm --filter @toka/agent-runtime dev",
    "agent:build": "pnpm --filter @toka/agent-core build && pnpm --filter @toka/agent-roles build && pnpm --filter @toka/agent-runtime build",
    "test": "pnpm --filter @toka/agent-core test && pnpm --filter @toka/agent-runtime test"
  }
}
```

- [ ] **Step 2: 创建 pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
  - "apps/*"
allowBuilds:
  esbuild: true
```

- [ ] **Step 3: 创建 .gitignore**

```
node_modules/
dist/
target/
.env
.env.*
*.port
.DS_Store
apps/desktop/dist/
```

- [ ] **Step 4: 创建 tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

- [ ] **Step 5: 初始化 git 并提交**

Run:
```bash
cd /Users/dean/code/toka && git init && pnpm install
git add package.json pnpm-workspace.yaml .gitignore tsconfig.base.json docs/
git commit -m "$(cat <<'EOF'
chore: scaffold toka monorepo workspace

Set up pnpm workspace root and design docs for the TickTick agent app.
EOF
)"
```

---

### Task 2: agent-core 包 — 类型与日期工具

**Files:**
- Create: `packages/agent-core/package.json`, `packages/agent-core/tsconfig.json`
- Create: `packages/agent-core/src/types.ts`, `packages/agent-core/src/datetime.ts`
- Create: `packages/agent-core/src/test/datetime.test.ts`

- [ ] **Step 1: 创建 packages/agent-core/package.json**

```json
{
  "name": "@toka/agent-core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "tsx src/test/datetime.test.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.17.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.15",
    "tsx": "^4.20.3",
    "typescript": "~5.8.3"
  }
}
```

- [ ] **Step 2: 写失败测试 packages/agent-core/src/test/datetime.test.ts**

```typescript
import assert from "node:assert/strict";
import {
  DEFAULT_TIMEZONE,
  addLocalDays,
  localDateString,
  resolveDateRangeFromMessage,
  startOfLocalDay,
} from "../datetime.js";

assert.equal(DEFAULT_TIMEZONE, "Asia/Shanghai");

const todayRange = resolveDateRangeFromMessage("今天有什么事");
assert.ok(todayRange);
assert.equal(localDateString(todayRange!.start), localDateString(new Date()));

const weekRange = resolveDateRangeFromMessage("本周待办");
assert.ok(weekRange);
assert.ok(weekRange!.end.getTime() >= weekRange!.start.getTime());

const d = startOfLocalDay(new Date("2026-06-20T15:30:00+08:00"));
assert.match(d.toISOString(), /2026-06-19|T20:00:00\.000Z|2026-06-20/);

const next = addLocalDays(d, 1);
assert.ok(next.getTime() > d.getTime());

console.log("datetime.test.ts: all passed");
```

- [ ] **Step 3: 运行测试确认失败**

Run: `cd packages/agent-core && pnpm test`
Expected: FAIL — module `../datetime.js` not found

- [ ] **Step 4: 实现 packages/agent-core/src/types.ts**

```typescript
export type UserIntent =
  | "create"
  | "update"
  | "schedule"
  | "breakdown"
  | "review"
  | "query";

export type AgentRole = "general" | "planner" | "scheduler" | "reviewer";

export interface AppConfig {
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  dida365Token: string;
  dida365McpUrl?: string;
}

export interface AnalyzerResult {
  intent: UserIntent;
  role: AgentRole;
  entities: {
    projectNames?: string[];
    dateRange?: { start: string; end: string };
    keywords?: string[];
  };
  contextNeeded: Array<"projects" | "tasks" | "dateRange">;
}

export interface ProjectSummary {
  id: string;
  name: string;
  kind?: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  projectId?: string;
  startDate?: string;
  dueDate?: string;
  priority?: number;
  status?: number;
  parentId?: string;
  sortOrder?: number;
}

export interface UserSnapshot {
  fetchedAt: number;
  timezone: "Asia/Shanghai";
  today: string;
  projects: ProjectSummary[];
  matchedTasks: TaskSummary[];
  dateRangeTasks: TaskSummary[];
  dateRangeLabel?: string;
}

export const MVP_TOOLS = [
  "list_projects",
  "create_project",
  "update_project",
  "get_project_by_id",
  "get_project_with_undone_tasks",
  "search_task",
  "get_task_by_id",
  "get_task_in_project",
  "create_task",
  "batch_add_tasks",
  "update_task",
  "batch_update_tasks",
  "complete_task",
  "complete_tasks_in_project",
  "delete_task",
  "move_task",
  "filter_tasks",
  "list_undone_tasks_by_date",
  "list_undone_tasks_by_time_query",
  "list_completed_tasks_by_date",
  "get_user_preference",
  "list_columns",
] as const;

export type MvpToolName = (typeof MVP_TOOLS)[number];

export interface AppliedAction {
  type: "create" | "update" | "complete" | "delete" | "move";
  taskTitle: string;
  detail: string;
}

export type SseEvent =
  | { type: "text_delta"; delta: string }
  | { type: "tool_start"; name: string; args: Record<string, unknown> }
  | { type: "tool_end"; name: string; result: unknown }
  | {
      type: "mcp_call";
      name: string;
      mcpUrl: string;
      request: { method: "tools/call"; name: string; arguments: Record<string, unknown> };
      response?: { raw: unknown; parsed: unknown };
      error?: string;
      durationMs: number;
    }
  | { type: "actions_applied"; actions: AppliedAction[] }
  | { type: "done"; message: string }
  | { type: "error"; message: string };
```

- [ ] **Step 5: 实现 packages/agent-core/src/datetime.ts**

```typescript
export const DEFAULT_TIMEZONE = "Asia/Shanghai";

export function localDateString(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: DEFAULT_TIMEZONE });
}

export function formatPromptDateTime(date = new Date()): string {
  return date.toLocaleString("zh-CN", {
    timeZone: DEFAULT_TIMEZONE,
    dateStyle: "full",
    timeStyle: "short",
  });
}

export function startOfLocalDay(date: Date): Date {
  const ymd = localDateString(date);
  return new Date(`${ymd}T00:00:00+08:00`);
}

export function addLocalDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function resolveDateRangeFromMessage(msg: string): {
  start: Date;
  end: Date;
  label: string;
} | null {
  const now = new Date();
  const today = startOfLocalDay(now);

  if (/今天|今日/.test(msg)) {
    const end = addLocalDays(today, 1);
    return { start: today, end, label: `今天 (${localDateString(today)})` };
  }
  if (/明天/.test(msg)) {
    const start = addLocalDays(today, 1);
    const end = addLocalDays(start, 1);
    return { start, end, label: `明天 (${localDateString(start)})` };
  }
  if (/后天/.test(msg)) {
    const start = addLocalDays(today, 2);
    const end = addLocalDays(start, 1);
    return { start, end, label: `后天 (${localDateString(start)})` };
  }
  if (/本周|这周/.test(msg)) {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = addLocalDays(today, mondayOffset);
    const end = addLocalDays(start, 7);
    return {
      start,
      end,
      label: `本周 (${localDateString(start)} ~ ${localDateString(addLocalDays(end, -1))})`,
    };
  }
  return null;
}
```

- [ ] **Step 6: 创建 packages/agent-core/src/index.ts 导出**

```typescript
export * from "./types.js";
export * from "./datetime.js";
export { Dida365McpClient } from "./mcp/client.js";
export { ContextEngine } from "./context/engine.js";
export { DOMAIN_RULES_TEXT } from "./rules/domain.js";
export { normalizeToolListResult, parseMcpToolContent } from "./mcp/normalize.js";
export { fetchUndoneTasksInRange } from "./mcp/task-fetch.js";
```

- [ ] **Step 7: 运行测试**

Run: `cd packages/agent-core && pnpm test`
Expected: `datetime.test.ts: all passed`

- [ ] **Step 8: Commit**

```bash
git add packages/agent-core/
git commit -m "$(cat <<'EOF'
feat(core): add shared types and datetime utilities

Foundation for timezone-aware date parsing used by context and scheduler.
EOF
)"
```

---

### Task 3: agent-core — MCP 客户端

**Files:**
- Create: `packages/agent-core/src/mcp/normalize.ts`
- Create: `packages/agent-core/src/mcp/client.ts`

- [ ] **Step 1: 实现 normalize.ts**

```typescript
export function parseMcpToolContent(result: unknown): unknown {
  if (!result || typeof result !== "object") return result;
  const r = result as { content?: Array<{ type: string; text?: string }> };
  if (!Array.isArray(r.content)) return result;
  const text = r.content.find((c) => c.type === "text")?.text;
  if (!text) return result;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function normalizeToolListResult(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.result)) return obj.result;
    if (Array.isArray(obj.projects)) return obj.projects;
    if (Array.isArray(obj.tasks)) return obj.tasks;
  }
  return [];
}
```

- [ ] **Step 2: 实现 client.ts**（参考 `/Users/dean/code/rick/packages/agent/src/mcp/client.ts`，改 client name 为 `toka-agent`，使用 `@toka/agent-core` 的 `MVP_TOOLS`）

核心结构：

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { AppConfig, MvpToolName } from "../types.js";
import { MVP_TOOLS } from "../types.js";
import { parseMcpToolContent } from "./normalize.js";

export class Dida365McpClient {
  // connect / disconnect / refreshTools / getOpenAiTools(filter?: string[])
  // callTool(name, args, retries=2) with McpCallObserver
  // healthCheck(): list_projects 或 tools/list
  // filterTools(names: string[]): 返回子集 OpenAI tools
}
```

- [ ] **Step 3: 编译验证**

Run: `cd packages/agent-core && pnpm build`
Expected: 无 TypeScript 错误

- [ ] **Step 4: Commit**

```bash
git add packages/agent-core/src/mcp/
git commit -m "$(cat <<'EOF'
feat(core): add Dida365 HTTP MCP client

Wraps StreamableHTTP transport with MVP tool registration and retry logic.
EOF
)"
```

---

### Task 4: agent-core — Context Engine 与 DomainRules

**Files:**
- Create: `packages/agent-core/src/mcp/task-fetch.ts`
- Create: `packages/agent-core/src/context/engine.ts`
- Create: `packages/agent-core/src/rules/domain.ts`
- Create: `packages/agent-core/src/test/context.test.ts`

- [ ] **Step 1: 写失败测试 context.test.ts**

```typescript
import assert from "node:assert/strict";
import { ContextEngine } from "../context/engine.js";
import type { AnalyzerResult } from "../types.js";

const calls: string[] = [];
const mockMcp = {
  callTool: async (name: string) => {
    calls.push(name);
    if (name === "list_projects") return [{ id: "p1", name: "工作" }];
    if (name === "search_task") return [{ id: "t1", title: "买牛奶" }];
    return [];
  },
};

const engine = new ContextEngine(mockMcp as never);
const analysis: AnalyzerResult = {
  intent: "query",
  role: "scheduler",
  entities: { keywords: ["牛奶"] },
  contextNeeded: ["projects", "tasks", "dateRange"],
};

const snap1 = await engine.build(analysis, "今天有什么事");
assert.equal(snap1.projects.length, 1);
assert.ok(snap1.today);

const snap2 = await engine.build(analysis, "今天有什么事");
assert.equal(calls.filter((c) => c === "list_projects").length, 1, "cache hit");

console.log("context.test.ts: all passed");
```

- [ ] **Step 2: 实现 task-fetch.ts** — 14 天窗口分段调用 `list_undone_tasks_by_date`（参考 Rick `mcp/dida365.ts` 的 `fetchUndoneTasksInRange`）

- [ ] **Step 3: 实现 context/engine.ts**

```typescript
export class ContextEngine {
  private cache: { key: string; snapshot: UserSnapshot; expires: number } | null = null;
  private TTL_MS = 60_000;

  constructor(private mcp: Dida365McpClient) {}

  async build(analysis: AnalyzerResult, userMessage: string): Promise<UserSnapshot> {
    const cacheKey = JSON.stringify({ analysis, userMessage });
    if (this.cache && this.cache.key === cacheKey && Date.now() < this.cache.expires) {
      return this.cache.snapshot;
    }
    // 按需拉 projects / search_task / dateRange
    // 返回 UserSnapshot，注入 today + timezone
    // 设置 cache
  }

  snapshotToPrompt(snapshot: UserSnapshot, analysis: AnalyzerResult): string {
    // 格式化 prompt，预取为空时加警告
  }
}
```

- [ ] **Step 4: 实现 rules/domain.ts** — 从 `/Users/dean/todo/.cursor/skills/dida365-task-management/SKILL.md` 提取 sortOrder/priority/parentId/不用标签 规则为 `DOMAIN_RULES_TEXT` 字符串

- [ ] **Step 5: 运行测试并 commit**

Run: `cd packages/agent-core && pnpm test`

---

### Task 5: agent-roles 包

**Files:**
- Create: `packages/agent-roles/package.json`, `tsconfig.json`
- Create: `packages/agent-roles/src/prompts/shared.ts`, `analyzer.ts`, `general.ts`, `planner.ts`, `scheduler.ts`, `reviewer.ts`
- Create: `packages/agent-roles/src/tools.ts`, `compose.ts`, `index.ts`
- Create: `packages/agent-roles/src/test/compose.test.ts`

- [ ] **Step 1: shared.ts** — 身份改为 Toka，`SHARED_WRITE_RULES` 去掉确认措辞：

```typescript
export const SHARED_IDENTITY =
  "你是 Toka 滴答清单助手，帮助用户管理滴答清单中的任务、日程和清单。";

export const SHARED_WRITE_RULES = `- 写操作前先读取相关数据，避免误改
- 批量创建任务优先用 batch_add_tasks
- list_undone_tasks_by_date 单次查询最多 14 天
- 写操作自动执行，无需等待用户确认`;
```

- [ ] **Step 2: 各角色 prompt** — 参考 Rick `packages/agent/src/prompts/*.ts`，Reviewer 删除「需用户确认」语句

- [ ] **Step 3: tools.ts** — 按 spec §3.4 定义 `ROLE_TOOLS: Record<AgentRole, string[]>`

- [ ] **Step 4: compose.ts**

```typescript
export function composeSystemPrompt(
  role: AgentRole,
  contextPrompt: string,
  domainRules: string,
): string {
  const rolePrompt = getRolePrompt(role);
  return [rolePrompt, domainRules, contextPrompt].join("\n\n");
}
```

- [ ] **Step 5: 测试 compose.test.ts** — 断言 planner prompt 含 `batch_add_tasks`，reviewer 含 `delete_task`，无「用户确认」

- [ ] **Step 6: Commit**

---

### Task 6: agent-runtime — LLM 与 Tool Loop

**Files:**
- Create: `packages/agent-runtime/package.json`（依赖 `@toka/agent-core`, `@toka/agent-roles`, `openai`, `hono`）
- Create: `packages/agent-runtime/src/llm/client.ts`
- Create: `packages/agent-runtime/src/llm/tool-loop.ts`

- [ ] **Step 1: tool-loop.ts** — 参考 Rick，**移除** `PendingConfirmation` / `confirmation_required` 逻辑；写操作工具（create/update/delete/complete/move/batch_*）执行后收集 `AppliedAction[]`

写操作检测：

```typescript
const WRITE_TOOLS = new Set([
  "create_task", "batch_add_tasks", "update_task", "batch_update_tasks",
  "complete_task", "delete_task", "move_task", "create_project",
]);

function actionFromTool(name: string, args: Record<string, unknown>, result: unknown): AppliedAction | null {
  // 从 args/result 提取 taskTitle 和 detail
}
```

连续失败 3 次中止 loop。

- [ ] **Step 2: client.ts** — OpenAI 兼容，`baseURL` + `apiKey` + `model` from AppConfig

- [ ] **Step 3: Commit**

---

### Task 7: agent-runtime — Pipeline 与 Analyzer

**Files:**
- Create: `packages/agent-runtime/src/pipeline/analyzer.ts`
- Create: `packages/agent-runtime/src/pipeline/pipeline.ts`
- Create: `packages/agent-runtime/src/store/memory.ts`
- Create: `packages/agent-runtime/src/test/pipeline.test.ts`

- [ ] **Step 1: analyzer.ts** — LLM JSON 解析 + heuristic fallback（参考 Rick `task-analyzer.ts`）

- [ ] **Step 2: memory.ts**

```typescript
export class MemoryConversationStore {
  private sessions = new Map<string, Array<{ role: "user" | "assistant"; content: string }>>();
  getMessages(sessionId: string) { return this.sessions.get(sessionId) ?? []; }
  appendMessage(sessionId: string, msg: { role: "user" | "assistant"; content: string }) { /* ... */ }
  clear(sessionId: string) { this.sessions.delete(sessionId); }
}
```

- [ ] **Step 3: pipeline.ts**

```typescript
export class AgentPipeline {
  async run(sessionId: string, userMessage: string, onEvent: (e: SseEvent) => void): Promise<void> {
    // 1. analyzeIntent
    // 2. contextEngine.build + snapshotToPrompt
    // 3. composeSystemPrompt + mcp.filterTools(ROLE_TOOLS[role])
    // 4. runToolLoop
    // 5. emit actions_applied + done
  }

  async fetchTasksForSchedule(range: "today" | "week"): Promise<TaskSummary[]> {
    // 直读 MCP，不经过 LLM
  }
}
```

- [ ] **Step 4: pipeline.test.ts** — mock MCP + mock LLM，验证 analyze fallback 与 actions_applied 收集

- [ ] **Step 5: Commit**

---

### Task 8: agent-runtime — HTTP Server

**Files:**
- Create: `packages/agent-runtime/src/server.ts`

- [ ] **Step 1: 实现 server.ts**（参考 Rick server，改端口与路由前缀）

```typescript
const PORT = Number(process.env.TOKA_AGENT_PORT ?? 17200);

// GET  /health
// GET  /api/config/status
// POST /api/config
// POST /api/config/test
// GET  /api/tasks?range=today|week
// POST /api/chat  → SSE (streamSSE)
// DELETE /api/sessions/:id
```

SSE chat handler:

```typescript
app.post("/api/chat", async (c) => {
  const { sessionId = "default", message } = await c.req.json();
  return streamSSE(c, async (stream) => {
    await pipeline.run(sessionId, message, async (event) => {
      await stream.writeSSE({ data: JSON.stringify(event) });
    });
  });
});
```

- [ ] **Step 2: 写端口文件** `os.tmpdir()/toka-agent.port` 供 Tauri 读取

- [ ] **Step 3: 本地启动验证**

Run: `cd packages/agent-runtime && TOKA_AGENT_PORT=17200 pnpm dev`
Run: `curl http://localhost:17200/health`
Expected: `{"status":"ok","port":17200}`

- [ ] **Step 4: Commit**

---

### Task 9: Tauri 桌面应用脚手架

**Files:**
- Create: `apps/desktop/` via `pnpm create tauri-app` 或手动从 Rick 复制结构

- [ ] **Step 1: 初始化 Vite + React + Tailwind**

```bash
cd /Users/dean/code/toka/apps/desktop
# package.json name: @toka/desktop
# dev port: 1420 (或 1430 避免冲突)
# dependencies: @tauri-apps/api, react, react-dom, react-markdown, remark-gfm
# devDependencies: @tauri-apps/cli, tailwindcss, @tailwindcss/vite, vite, typescript
```

- [ ] **Step 2: tauri.conf.json**

```json
{
  "productName": "Toka",
  "identifier": "com.dean.toka",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:1430",
    "beforeBuildCommand": "pnpm build:all",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{ "title": "Toka · 滴答清单 Agent", "width": 1280, "height": 800 }]
  }
}
```

- [ ] **Step 3: Rust sidecar 启动** — 参考 Rick `src-tauri/src/lib.rs`：
  - dev 模式 spawn `pnpm agent:dev`
  - 写 `get_agent_url` command 读 port 文件
  - Keychain commands: `save_credentials`, `load_credentials`

- [ ] **Step 4: 验证 Tauri 空壳启动**

Run: `pnpm dev`（从 repo 根）
Expected: 窗口打开，sidecar health OK

- [ ] **Step 5: Commit**

---

### Task 10: Settings 页 + 凭证

**Files:**
- Create: `apps/desktop/src/components/Settings/SettingsPanel.tsx`
- Create: `apps/desktop/src/hooks/useSettings.ts`

- [ ] **Step 1: SettingsPanel 字段**

- LLM Base URL（默认 `https://api.openai.com/v1`）
- LLM API Key
- LLM Model（placeholder「如 gpt-4o-mini」）
- 滴答 Token（placeholder「dp_...」）
- MCP URL（默认 `https://mcp.dida365.com`）
- Debug 模式 toggle → localStorage `toka:debug`

- [ ] **Step 2: 保存流程**

1. Tauri Keychain 存敏感字段
2. POST `/api/config` 同步到 sidecar
3. POST `/api/config/test` 验证滴答连接

- [ ] **Step 3: Commit**

---

### Task 11: Chat UI

**Files:**
- Create: `apps/desktop/src/hooks/useAgent.ts`
- Create: `apps/desktop/src/components/Chat/ChatPanel.tsx`
- Create: `apps/desktop/src/components/Chat/MarkdownContent.tsx`
- Create: `apps/desktop/src/components/Chat/ToolTrace.tsx`
- Create: `apps/desktop/src/components/Chat/DebugLogPanel.tsx`
- Modify: `apps/desktop/src/App.tsx`

- [ ] **Step 1: useAgent.ts** — 参考 Rick，**移除** `pendingConfirmation` / `confirmAction`；新增：
  - `actionsApplied` state（来自 `actions_applied` 事件）
  - `onDone` callback 触发 ScheduleView refresh

- [ ] **Step 2: ChatPanel** — 消息列表 + 流式输入 + 快捷指令按钮：
  - 「今天有什么事」
  - 「本周待办」
  - 「做个回顾」

- [ ] **Step 3: ToolTrace** — 折叠卡片展示 tool_start/tool_end

- [ ] **Step 4: App.tsx 双栏布局**

```tsx
<div className="flex h-full gap-4">
  <div className="w-[55%] min-w-0"><ChatPanel ... /></div>
  <div className="w-[45%] min-w-0"><ScheduleView onTaskClick={...} refreshKey={...} /></div>
</div>
```

- [ ] **Step 5: Commit**

---

### Task 12: ScheduleView

**Files:**
- Create: `apps/desktop/src/components/Schedule/ScheduleView.tsx`
- Create: `apps/desktop/src/components/Schedule/TaskList.tsx`

- [ ] **Step 1: ScheduleView**

- Tab: 今日 / 本周
- `GET /api/tasks?range=today|week`
- 加载态 / 空态 / 错误态
- 点击任务 → `onTaskClick({ id, title })`

- [ ] **Step 2: TaskList 渲染**

按 priority 降序 + startDate 排序，显示标题、清单名、时间、优先级标记

- [ ] **Step 3: Commit**

---

### Task 13: 集成 polish + README

**Files:**
- Create: `README.md`
- Modify: 错误处理边界情况

- [ ] **Step 1: README.md** — 含：
  - 前置：Node 20+、pnpm、Rust（Tauri）
  - 配置滴答 Token 步骤
  - `pnpm dev` 启动
  - 架构简图

- [ ] **Step 2: 端到端冒烟**

1. 配置 LLM + Token
2. 「今天有什么事」→ 返回任务
3. 「加个待办：测试 Toka」→ 创建成功，ScheduleView 刷新
4. Debug 模式可见 mcp_call

- [ ] **Step 3: 运行全部测试**

Run: `pnpm test`
Expected: agent-core + agent-runtime tests pass

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
docs: add README and complete MVP integration

Document setup steps and verify chat + schedule flows against TickTick MCP.
EOF
)"
```

---

## Spec 覆盖自检

| Spec 章节 | 对应 Task |
|-----------|-----------|
| §2 分层 Monorepo + Pipeline | Task 1, 7 |
| §3 四角色 + 工具子集 | Task 5, 6 |
| §4 Context Engine 缓存 | Task 4 |
| §5 UI 双栏 + SSE | Task 11, 12 |
| §5 写操作自动执行 | Task 6（无 confirmation） |
| §5 Keychain 凭证 | Task 9, 10 |
| §6 错误处理 | Task 6, 8 |
| §7 测试 | Task 2, 4, 5, 7 |
| §11 验收标准 | Task 13 |

---

## 执行顺序建议

```
Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13
```

Task 1–8 可纯后端开发（`pnpm agent:dev` 验证）；Task 9 起需要 Tauri 环境。
