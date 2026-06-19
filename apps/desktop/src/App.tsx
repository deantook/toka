import { useCallback, useState } from "react";
import { ChatHistorySidebar } from "./components/Chat/ChatHistorySidebar";
import { SidebarFooter } from "./components/Chat/SidebarFooter";
import { ChatPanel } from "./components/Chat/ChatPanel";
import { DebugLogPanel } from "./components/Chat/DebugLogPanel";
import { SettingsPanel } from "./components/Settings/SettingsPanel";
import { useAgent } from "./hooks/useAgent";
import { useSettings } from "./hooks/useSettings";

const SIDEBAR_COLLAPSED_KEY = "toka:sidebar-collapsed";

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const settings = useSettings();
  const {
    messages,
    streaming,
    sessions,
    currentSessionId,
    requestLogs,
    sendMessage,
    switchSession,
    startNewSession,
    deleteSession,
    clearAllSessions,
    clearRequestLogs,
    configReady,
    missingDidaToken,
    missingLlmKey,
  } = useAgent({
    debugMode: settings.debugMode,
    hasDidaToken: Boolean(settings.dida365Token.trim()),
    hasLlmKey: Boolean(settings.llmApiKey.trim()),
  });

  const setSidebarOpen = useCallback((open: boolean) => {
    setSidebarCollapsed(!open);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!open));
    } catch {
      // ignore storage errors
    }
  }, []);

  return (
    <div className="h-screen flex bg-[#f7f7f5] text-[#1c1c1a]">
      <aside
        className={`shrink-0 flex flex-col h-full border-r border-[#e8e8e4] bg-[#f0f0ec] overflow-hidden transition-[width] duration-200 ease-out ${
          sidebarCollapsed ? "w-7" : "w-52"
        }`}
      >
        <div className="flex-1 min-h-0 overflow-hidden">
          {!sidebarCollapsed && (
            <ChatHistorySidebar
              sessions={sessions}
              currentSessionId={currentSessionId}
              streaming={streaming}
              onSelect={switchSession}
              onNew={startNewSession}
              onDelete={deleteSession}
              onClearAll={clearAllSessions}
            />
          )}
        </div>
        <SidebarFooter
          collapsed={sidebarCollapsed}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleSidebar={() => setSidebarOpen(sidebarCollapsed)}
        />
      </aside>

      <div className="flex-1 flex min-w-0 min-h-0">
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <ChatPanel
            messages={messages}
            streaming={streaming}
            debugMode={settings.debugMode}
            configReady={configReady}
            missingDidaToken={missingDidaToken}
            missingLlmKey={missingLlmKey}
            onOpenSettings={() => setSettingsOpen(true)}
            onSend={sendMessage}
          />
          {settings.debugMode && (
            <div className="shrink-0 h-48 border-t border-[#e8e8e4] xl:hidden">
              <DebugLogPanel
                logs={requestLogs}
                onClear={clearRequestLogs}
                onClose={() => settings.setDebugMode(false)}
              />
            </div>
          )}
        </main>

        {settings.debugMode && (
          <aside className="hidden xl:flex w-80 shrink-0 border-l border-[#e8e8e4] min-h-0">
            <DebugLogPanel
              logs={requestLogs}
              onClear={clearRequestLogs}
              onClose={() => settings.setDebugMode(false)}
            />
          </aside>
        )}
      </div>

      {settingsOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/20"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="relative w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto bg-[#fafaf8] border border-[#dcdcd8] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <SettingsPanel
              {...settings}
              onClose={() => setSettingsOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
