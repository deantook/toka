const GITHUB_URL = "https://github.com/deantook/toka";
const RELEASES_URL = "https://github.com/deantook/toka/releases/latest";
const DIDA365_TOKEN_URL =
  "https://dida365.com/webapp/#q/all/tasks?modalType=settings";

const features = [
  {
    title: "四角色 Agent",
    description:
      "意图分析、任务规划、日程安排、回顾复盘——按你的诉求自动切换角色，而不是单一聊天机器人。",
  },
  {
    title: "深度对接滴答清单",
    description:
      "通过 HTTP MCP 直连滴答清单，读写任务、清单与日程。说出今天的事，Agent 帮你落地到清单里。",
  },
  {
    title: "本地运行，凭证不上传",
    description:
      "桌面应用 + 本地 Agent sidecar。滴答 Token 与 LLM API Key 保存在本机 settings.json，不经第三方服务器。",
  },
  {
    title: "轻量桌面体验",
    description:
      "Tauri 构建，占用小、启动快。侧边栏会话历史、流式回复，界面克制干净，专注对话本身。",
  },
];

const steps = [
  {
    step: "01",
    title: "下载并打开 Toka",
    description: "从 GitHub Releases 获取 macOS 或 Windows 安装包，首次打开在系统安全提示中允许运行。",
  },
  {
    step: "02",
    title: "配置滴答 Token 与 LLM",
    description:
      "在设置页填入滴答 API 口令（dp_...）和 OpenAI 兼容 API。Sidecar 会在本地 127.0.0.1:17200 提供服务。",
  },
  {
    step: "03",
    title: "用自然语言管理清单",
    description:
      "例如「帮我把今天的事理一理」「下午三点加个会议」「这周完成了什么」——Agent 会理解意图并执行。",
  },
];

const roles = [
  { name: "意图分析", hint: "理解你想做什么" },
  { name: "规划", hint: "拆解任务、排优先级" },
  { name: "日程", hint: "安排时间与提醒" },
  { name: "回顾", hint: "复盘完成情况" },
];

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="text-[13px] text-[#5c5c58] hover:text-[#1c1c1a] transition-colors"
    >
      {children}
    </a>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a8a84] font-medium mb-3">
      {children}
    </p>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#1c1c1a]">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(#e8e8e4 1px, transparent 1px),
            linear-gradient(90deg, #e8e8e4 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage: "linear-gradient(to bottom, black 0%, transparent 70%)",
        }}
      />

      <header className="relative z-10 border-b border-[#e8e8e4]/80 bg-[#f7f7f5]/90 backdrop-blur-sm sticky top-0">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <span className="w-7 h-7 rounded-lg bg-[#1c1c1a] text-[#f7f7f5] text-sm font-semibold flex items-center justify-center group-hover:bg-[#333] transition-colors">
              T
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Toka</span>
          </a>
          <nav className="hidden sm:flex items-center gap-7">
            <NavLink href="#features">特性</NavLink>
            <NavLink href="#how-it-works">使用方式</NavLink>
            <NavLink href="#setup">配置</NavLink>
            <a
              href={RELEASES_URL}
              className="text-[13px] px-3.5 py-1.5 bg-[#1c1c1a] text-[#f7f7f5] hover:bg-[#333] transition-colors"
            >
              下载
            </a>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="grid lg:grid-cols-[1fr_380px] gap-12 lg:gap-16 items-center">
            <div>
              <p className="animate-fade-up text-[13px] text-[#5c5c58] mb-4">
                滴答清单 · 桌面 Agent
              </p>
              <h1 className="animate-fade-up-delay-1 text-[2.5rem] sm:text-[3.25rem] font-semibold leading-[1.12] tracking-tight mb-5">
                用说的，
                <br />
                管清单。
              </h1>
              <p className="animate-fade-up-delay-2 text-[17px] sm:text-[18px] text-[#5c5c58] leading-relaxed max-w-lg mb-8">
                Toka 是一款基于 Tauri 的桌面应用，内置 Agent 运行时。对接滴答清单 MCP，
                帮你理清、安排、复盘任务与日程——像和助手说话一样管理待办。
              </p>
              <div className="animate-fade-up-delay-2 flex flex-wrap gap-3">
                <a
                  href={RELEASES_URL}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1c1c1a] text-[#f7f7f5] text-[14px] font-medium hover:bg-[#333] transition-colors"
                >
                  下载最新版
                  <span aria-hidden>↓</span>
                </a>
                <a
                  href={GITHUB_URL}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#dcdcd8] bg-white/60 text-[14px] hover:border-[#aaa] transition-colors"
                >
                  查看源码
                </a>
              </div>
              <p className="mt-6 text-[12px] text-[#8a8a84]">
                支持 macOS（Apple Silicon / Intel）与 Windows · 开源 · 本地凭证
              </p>
            </div>

            {/* Chat mockup */}
            <div className="animate-fade-up-delay-2 border border-[#dcdcd8] bg-[#fafaf8] shadow-[0_24px_48px_-12px_rgba(28,28,26,0.08)]">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e8e8e4] bg-[#f0f0ec]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#dcdcd8]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#dcdcd8]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#dcdcd8]" />
                <span className="ml-2 text-[12px] text-[#8a8a84]">Toka · 对话</span>
              </div>
              <div className="p-4 space-y-3 text-[13px] leading-relaxed">
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-[#1c1c1a] text-[#f7f7f5] px-3 py-2">
                    帮我把今天的事理一理，下午有个产品评审
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[90%] bg-white border border-[#e8e8e4] px-3 py-2 text-[#1c1c1a]">
                    <p className="mb-2">好的，我看了你的清单。建议今天重点：</p>
                    <ul className="list-disc pl-4 space-y-1 text-[#5c5c58]">
                      <li>14:00 产品评审（已写入日历）</li>
                      <li>上午完成 PR 审查（P1）</li>
                      <li>傍晚复盘本周任务</li>
                    </ul>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-[#1c1c1a] text-[#f7f7f5] px-3 py-2">
                    把 PR 审查改到明天上午
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[#8a8a84] text-[12px] pl-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8a8a84] animate-pulse" />
                  Agent 正在更新任务…
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Roles strip */}
        <section className="border-y border-[#e8e8e4] bg-[#f0f0ec]/60">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-4">
              {roles.map((role) => (
                <div key={role.name} className="text-center sm:text-left">
                  <p className="text-[14px] font-semibold">{role.name}</p>
                  <p className="text-[12px] text-[#8a8a84] mt-0.5">{role.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-5xl mx-auto px-6 py-20 sm:py-24">
          <SectionLabel>特性</SectionLabel>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-12 max-w-xl">
            不是聊天窗口，
            <br className="hidden sm:block" />
            是懂滴答清单的 Agent。
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {features.map((f) => (
              <article
                key={f.title}
                className="border border-[#e8e8e4] bg-[#fafaf8] p-6 hover:border-[#ccc] transition-colors"
              >
                <h3 className="text-[15px] font-semibold mb-2">{f.title}</h3>
                <p className="text-[14px] text-[#5c5c58] leading-relaxed">{f.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section className="border-y border-[#e8e8e4] bg-[#fafaf8]">
          <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
            <SectionLabel>架构</SectionLabel>
            <h2 className="text-2xl font-semibold tracking-tight mb-8">分层 Monorepo，职责清晰</h2>
            <div className="font-mono text-[12px] sm:text-[13px] leading-relaxed text-[#5c5c58] bg-[#f0f0ec] border border-[#e8e8e4] p-5 sm:p-6 overflow-x-auto">
              <pre className="m-0">{`toka/
├── apps/desktop/           Tauri + React 桌面 UI
├── packages/agent-core/    MCP 客户端 · Context Engine
├── packages/agent-roles/   四角色 Prompt 与工具策略
└── packages/agent-runtime/ LLM · Pipeline · HTTP/SSE sidecar

桌面 UI ──SSE/REST──▶ Agent Pipeline ──MCP──▶ 滴答清单`}</pre>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-20 sm:py-24">
          <SectionLabel>使用方式</SectionLabel>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-12">
            三步开始
          </h2>
          <div className="space-y-0">
            {steps.map((s, i) => (
              <div
                key={s.step}
                className={`grid sm:grid-cols-[80px_1fr] gap-4 sm:gap-8 py-8 ${
                  i < steps.length - 1 ? "border-b border-[#e8e8e4]" : ""
                }`}
              >
                <p className="text-[13px] font-mono text-[#8a8a84]">{s.step}</p>
                <div>
                  <h3 className="text-[16px] font-semibold mb-2">{s.title}</h3>
                  <p className="text-[14px] text-[#5c5c58] leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Setup */}
        <section id="setup" className="border-t border-[#e8e8e4] bg-[#f0f0ec]/40">
          <div className="max-w-5xl mx-auto px-6 py-20 sm:py-24">
            <SectionLabel>配置说明</SectionLabel>
            <h2 className="text-2xl font-semibold tracking-tight mb-10">首次使用前</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-[#e8e8e4] bg-[#fafaf8] p-6">
                <h3 className="text-[15px] font-semibold mb-3">滴答 Token</h3>
                <ol className="text-[14px] text-[#5c5c58] space-y-2 list-decimal pl-4">
                  <li>
                    在{" "}
                    <a
                      href={DIDA365_TOKEN_URL}
                      className="text-[#1c1c1a] underline underline-offset-2 hover:text-[#555]"
                      target="_blank"
                      rel="noreferrer"
                    >
                      滴答清单网页版
                    </a>{" "}
                    进入「设置 → 账户与安全 → API 口令管理」
                  </li>
                  <li>复制 API 口令（格式 dp_...）</li>
                  <li>粘贴到 Toka 设置页的「滴答 Token」字段</li>
                </ol>
              </div>
              <div className="border border-[#e8e8e4] bg-[#fafaf8] p-6">
                <h3 className="text-[15px] font-semibold mb-3">LLM API</h3>
                <p className="text-[14px] text-[#5c5c58] leading-relaxed mb-3">
                  Toka 使用 OpenAI 兼容 API 驱动 Agent。在设置页配置 Base URL、Model 与 API Key。
                </p>
                <dl className="text-[13px] text-[#5c5c58] space-y-1.5">
                  <div className="flex gap-2">
                    <dt className="text-[#8a8a84] shrink-0 w-24">默认端点</dt>
                    <dd className="font-mono text-[12px]">api.openai.com/v1</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-[#8a8a84] shrink-0 w-24">凭证存储</dt>
                    <dd>本地 settings.json，不上传</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* Download CTA */}
        <section className="max-w-5xl mx-auto px-6 py-20 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
            准备好用说话的方式管清单了吗？
          </h2>
          <p className="text-[15px] text-[#5c5c58] mb-8 max-w-md mx-auto">
            从 GitHub Releases 下载安装包。推送 main 分支后会自动构建 macOS 与 Windows 版本。
          </p>
          <a
            href={RELEASES_URL}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1c1c1a] text-[#f7f7f5] text-[15px] font-medium hover:bg-[#333] transition-colors"
          >
            前往 Releases 下载
          </a>
          <p className="mt-6 text-[12px] text-[#8a8a84] max-w-lg mx-auto leading-relaxed">
            安装包未做代码签名。macOS 首次打开需在「系统设置 → 隐私与安全性」中允许；
            Windows 可能弹出 SmartScreen 提示。
          </p>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[#e8e8e4] bg-[#f0f0ec]">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-[#8a8a84]">
            © {new Date().getFullYear()} Toka · 用说的，管清单
          </p>
          <div className="flex items-center gap-6">
            <a
              href={GITHUB_URL}
              className="text-[13px] text-[#5c5c58] hover:text-[#1c1c1a] transition-colors"
            >
              GitHub
            </a>
            <a
              href={RELEASES_URL}
              className="text-[13px] text-[#5c5c58] hover:text-[#1c1c1a] transition-colors"
            >
              Releases
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
