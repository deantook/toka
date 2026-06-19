import type { RequestLogEntry, SseEvent } from "../../types";

interface Props {
  logs: RequestLogEntry[];
  onClear: () => void;
  onClose: () => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("zh-CN", { hour12: false });
  } catch {
    return iso;
  }
}

function getMcpCalls(events?: SseEvent[]): SseEvent[] {
  return events?.filter((e) => e.type === "mcp_call") ?? [];
}

function McpCallBlock({ call }: { call: SseEvent }) {
  const failed = Boolean(call.error);
  return (
    <details className="rounded border border-slate-600 bg-slate-900/60">
      <summary className="cursor-pointer px-2 py-1.5 flex items-center gap-2 flex-wrap">
        <span
          className={`px-1 py-0.5 rounded text-[10px] font-semibold ${
            failed ? "bg-red-500/20 text-red-300" : "bg-cyan-500/20 text-cyan-300"
          }`}
        >
          MCP
        </span>
        <span className="text-cyan-200">{call.name}</span>
        {call.durationMs != null && (
          <span className="text-slate-500">{call.durationMs}ms</span>
        )}
        {call.error && <span className="text-red-400 truncate">{call.error}</span>}
      </summary>
      <div className="px-2 pb-2 space-y-2 border-t border-slate-700/50 pt-2">
        {call.mcpUrl && (
          <div>
            <p className="text-slate-500 mb-0.5">MCP URL</p>
            <pre className="whitespace-pre-wrap break-all text-slate-400">{call.mcpUrl}</pre>
          </div>
        )}
        {call.request && (
          <div>
            <p className="text-slate-500 mb-0.5">Request</p>
            <pre className="whitespace-pre-wrap break-all text-slate-300 max-h-32 overflow-y-auto">
              {JSON.stringify(call.request, null, 2)}
            </pre>
          </div>
        )}
        {call.response && (
          <div>
            <p className="text-slate-500 mb-0.5">Response (parsed)</p>
            <pre className="whitespace-pre-wrap break-all text-slate-300 max-h-40 overflow-y-auto">
              {JSON.stringify(call.response.parsed, null, 2)}
            </pre>
            <p className="text-slate-500 mb-0.5 mt-2">Response (raw)</p>
            <pre className="whitespace-pre-wrap break-all text-slate-400 max-h-32 overflow-y-auto">
              {JSON.stringify(call.response.raw, null, 2)}
            </pre>
          </div>
        )}
        {call.error && (
          <div>
            <p className="text-red-400 mb-0.5">Error</p>
            <pre className="whitespace-pre-wrap break-all text-red-300">{call.error}</pre>
          </div>
        )}
      </div>
    </details>
  );
}

export function DebugLogPanel({ logs, onClear, onClose }: Props) {
  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
            DEBUG
          </span>
          <h2 className="text-sm font-semibold">请求日志</h2>
          <span className="text-xs text-slate-400">({logs.length})</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            清空日志
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            退出调试
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 font-mono text-xs">
        {logs.length === 0 && (
          <p className="text-slate-500 text-center py-6">暂无请求，发送消息后将在此记录</p>
        )}
        {logs.map((log) => {
          const mcpCalls = getMcpCalls(log.sseEvents);
          const otherEvents =
            log.sseEvents?.filter((e) => e.type !== "mcp_call") ?? [];

          return (
            <details
              key={log.id}
              className="rounded-lg border border-slate-700 bg-slate-800/50 open:bg-slate-800"
            >
              <summary className="cursor-pointer px-3 py-2 flex items-center gap-2 flex-wrap">
                <span className="text-slate-500">{formatTime(log.timestamp)}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    log.error
                      ? "bg-red-500/20 text-red-300"
                      : log.status && log.status >= 400
                        ? "bg-orange-500/20 text-orange-300"
                        : "bg-emerald-500/20 text-emerald-300"
                  }`}
                >
                  {log.method}
                </span>
                <span className="text-indigo-300">{log.label}</span>
                {log.status != null && (
                  <span className="text-slate-400">{log.status}</span>
                )}
                {log.durationMs != null && (
                  <span className="text-slate-500">{log.durationMs}ms</span>
                )}
                {mcpCalls.length > 0 && (
                  <span className="text-cyan-400">{mcpCalls.length} MCP</span>
                )}
                {otherEvents.length > 0 && (
                  <span className="text-slate-500">{otherEvents.length} SSE</span>
                )}
                {log.error && <span className="text-red-400 truncate">{log.error}</span>}
              </summary>
              <div className="px-3 pb-3 space-y-2 border-t border-slate-700/50 pt-2">
                <div>
                  <p className="text-slate-500 mb-1">URL</p>
                  <pre className="whitespace-pre-wrap break-all text-slate-300">{log.url}</pre>
                </div>
                {log.requestBody !== undefined && (
                  <div>
                    <p className="text-slate-500 mb-1">Request Body</p>
                    <pre className="whitespace-pre-wrap break-all text-slate-300 max-h-40 overflow-y-auto">
                      {JSON.stringify(log.requestBody, null, 2)}
                    </pre>
                  </div>
                )}
                {(log.status != null || log.statusText) && (
                  <div>
                    <p className="text-slate-500 mb-1">Response</p>
                    <pre className="whitespace-pre-wrap text-slate-300">
                      {log.status} {log.statusText ?? ""}
                    </pre>
                  </div>
                )}
                {mcpCalls.length > 0 && (
                  <div>
                    <p className="text-slate-500 mb-1">MCP 调用 ({mcpCalls.length})</p>
                    <div className="space-y-1.5">
                      {mcpCalls.map((call, i) => (
                        <McpCallBlock key={`${call.name}-${i}`} call={call} />
                      ))}
                    </div>
                  </div>
                )}
                {otherEvents.length > 0 && (
                  <div>
                    <p className="text-slate-500 mb-1">其他 SSE Events ({otherEvents.length})</p>
                    <pre className="whitespace-pre-wrap break-all text-slate-300 max-h-48 overflow-y-auto">
                      {JSON.stringify(otherEvents, null, 2)}
                    </pre>
                  </div>
                )}
                {log.error && (
                  <div>
                    <p className="text-red-400 mb-1">Error</p>
                    <pre className="whitespace-pre-wrap break-all text-red-300">{log.error}</pre>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
