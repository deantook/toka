import { useState } from "react";

type Tab = "chat" | "settings";

function App() {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="shrink-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            T
          </div>
          <h1 className="font-semibold text-slate-800">Toka · 滴答清单 Agent</h1>
        </div>
        <nav className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(
            [
              ["chat", "对话"],
              ["settings", "设置"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                tab === id
                  ? "bg-white text-indigo-600 shadow-sm font-medium"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 p-4 min-h-0">
        {tab === "chat" && (
          <div className="h-full flex gap-4 min-h-0">
            <section className="flex-[55] min-w-0 rounded-xl border border-slate-200 bg-white p-6 flex items-center justify-center text-slate-400 text-sm">
              对话面板（占位）
            </section>
            <section className="flex-[45] min-w-0 rounded-xl border border-slate-200 bg-white p-6 flex items-center justify-center text-slate-400 text-sm">
              日程视图（占位）
            </section>
          </div>
        )}
        {tab === "settings" && (
          <section className="h-full rounded-xl border border-slate-200 bg-white p-6 flex items-center justify-center text-slate-400 text-sm">
            设置面板（占位）
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
