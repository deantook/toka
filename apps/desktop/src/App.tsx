import { useRef, useState } from "react";
import { ChatPanel, type ChatPanelHandle } from "./components/Chat/ChatPanel";
import { DebugLogPanel } from "./components/Chat/DebugLogPanel";
import { ScheduleView } from "./components/Schedule/ScheduleView";
import { SettingsPanel } from "./components/Settings/SettingsPanel";
import { useAgent } from "./hooks/useAgent";
import { useSettings } from "./hooks/useSettings";

type Tab = "chat" | "settings";

function App() {
  const [tab, setTab] = useState<Tab>("chat");
  const chatRef = useRef<ChatPanelHandle>(null);
  const settings = useSettings();
  const {
    messages,
    streaming,
    requestLogs,
    refreshKey,
    sendMessage,
    clearHistory,
    clearRequestLogs,
    agentUrl,
  } = useAgent({ debugMode: settings.debugMode });

  const handleTaskClick = (task: { id: string; title: string }) => {
    chatRef.current?.setInput(`关于任务『${task.title}』`);
  };

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
          <div
            className={`h-full flex gap-4 min-h-0 ${
              settings.debugMode ? "max-w-7xl mx-auto" : ""
            }`}
          >
            <div className="w-[55%] min-w-0 flex flex-col min-h-0">
              <ChatPanel
                ref={chatRef}
                messages={messages}
                streaming={streaming}
                debugMode={settings.debugMode}
                onSend={sendMessage}
                onClear={clearHistory}
              />
            </div>
            <div className="w-[45%] min-w-0 flex flex-col min-h-0">
              <ScheduleView
                agentUrl={agentUrl}
                refreshKey={refreshKey}
                onTaskClick={handleTaskClick}
              />
            </div>
            {settings.debugMode && (
              <div className="w-[380px] shrink-0 min-h-0 hidden xl:block">
                <DebugLogPanel
                  logs={requestLogs}
                  onClear={clearRequestLogs}
                  onClose={() => settings.setDebugMode(false)}
                />
              </div>
            )}
          </div>
        )}
        {settings.debugMode && tab === "chat" && (
          <div className="mt-4 max-w-7xl mx-auto xl:hidden h-64 min-h-0">
            <DebugLogPanel
              logs={requestLogs}
              onClear={clearRequestLogs}
              onClose={() => settings.setDebugMode(false)}
            />
          </div>
        )}
        {tab === "settings" && <SettingsPanel {...settings} />}
      </main>
    </div>
  );
}

export default App;
