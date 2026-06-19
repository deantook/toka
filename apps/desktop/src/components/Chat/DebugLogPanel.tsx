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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-[#8a8a86] mb-1 uppercase tracking-wide">
      {children}
    </p>
  );
}

function CodeBlock({
  children,
  maxHeight,
}: {
  children: string;
  maxHeight?: string;
}) {
  return (
    <pre
      className={`whitespace-pre-wrap break-all text-[11px] font-mono text-[#3d3d3a] bg-white border border-[#e8e8e4] px-2 py-1.5 overflow-y-auto leading-relaxed ${
        maxHeight ?? ""
      }`}
    >
      {children}
    </pre>
  );
}

function McpCallBlock({ call }: { call: SseEvent }) {
  const failed = Boolean(call.error);
  return (
    <details className="border border-[#e8e8e4] bg-white open:border-[#dcdcd8]">
      <summary className="cursor-pointer px-2.5 py-2 flex items-center gap-2 flex-wrap text-[12px]">
        <span
          className={`px-1 py-0.5 text-[10px] font-medium border ${
            failed
              ? "text-[#8b4513] bg-[#faf0e8] border-[#e8d4c4]"
              : "text-[#5c5c58] bg-[#f0f0ec] border-[#dcdcd8]"
          }`}
        >
          MCP
        </span>
        <span className="text-[#1c1c1a]">{call.name}</span>
        {call.durationMs != null && (
          <span className="text-[#aaa]">{call.durationMs}ms</span>
        )}
        {call.error && (
          <span className="text-[#8b4513] truncate">{call.error}</span>
        )}
      </summary>
      <div className="px-2.5 pb-2.5 space-y-2 border-t border-[#e8e8e4] pt-2">
        {call.mcpUrl && (
          <div>
            <Label>MCP URL</Label>
            <CodeBlock>{call.mcpUrl}</CodeBlock>
          </div>
        )}
        {call.request && (
          <div>
            <Label>Request</Label>
            <CodeBlock maxHeight="max-h-32">
              {JSON.stringify(call.request, null, 2)}
            </CodeBlock>
          </div>
        )}
        {call.response && (
          <div>
            <Label>Response (parsed)</Label>
            <CodeBlock maxHeight="max-h-40">
              {JSON.stringify(call.response.parsed, null, 2)}
            </CodeBlock>
            <Label>Response (raw)</Label>
            <CodeBlock maxHeight="max-h-32">
              {JSON.stringify(call.response.raw, null, 2)}
            </CodeBlock>
          </div>
        )}
        {call.error && (
          <div>
            <Label>Error</Label>
            <CodeBlock>{call.error}</CodeBlock>
          </div>
        )}
      </div>
    </details>
  );
}

export function DebugLogPanel({ logs, onClear, onClose }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#f0f0ec] text-[#1c1c1a] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#e0e0dc] shrink-0 bg-[#f0f0ec]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-1.5 py-0.5 text-[#8a6d3b] bg-[#f5f0e1] border border-[#e8dfc8]">
            DEBUG
          </span>
          <h2 className="text-[13px] font-medium text-[#1c1c1a]">请求日志</h2>
          <span className="text-[11px] text-[#aaa]">({logs.length})</span>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClear}
            className="text-[12px] text-[#aaa] hover:text-[#5c5c58] transition-colors"
          >
            清空
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] text-[#aaa] hover:text-[#5c5c58] transition-colors"
          >
            关闭
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {logs.length === 0 && (
          <p className="text-[#bbb] text-[12px] text-center py-8">
            暂无请求，发送消息后将在此记录
          </p>
        )}
        {logs.map((log) => {
          const mcpCalls = getMcpCalls(log.sseEvents);
          const otherEvents =
            log.sseEvents?.filter((e) => e.type !== "mcp_call") ?? [];
          const failed = Boolean(log.error || (log.status && log.status >= 400));

          return (
            <details
              key={log.id}
              className="border border-[#e8e8e4] bg-[#fafaf8] open:bg-white"
            >
              <summary className="cursor-pointer px-3 py-2 flex items-center gap-2 flex-wrap text-[12px]">
                <span className="text-[#aaa] font-mono">{formatTime(log.timestamp)}</span>
                <span
                  className={`px-1 py-0.5 text-[10px] font-medium border ${
                    failed
                      ? "text-[#8b4513] bg-[#faf0e8] border-[#e8d4c4]"
                      : "text-[#5c5c58] bg-[#f0f0ec] border-[#dcdcd8]"
                  }`}
                >
                  {log.method}
                </span>
                <span className="text-[#3d3d3a]">{log.label}</span>
                {log.status != null && (
                  <span className="text-[#aaa]">{log.status}</span>
                )}
                {log.durationMs != null && (
                  <span className="text-[#aaa]">{log.durationMs}ms</span>
                )}
                {mcpCalls.length > 0 && (
                  <span className="text-[#8a8a86]">{mcpCalls.length} MCP</span>
                )}
                {otherEvents.length > 0 && (
                  <span className="text-[#aaa]">{otherEvents.length} SSE</span>
                )}
                {log.error && (
                  <span className="text-[#8b4513] truncate">{log.error}</span>
                )}
              </summary>
              <div className="px-3 pb-3 space-y-2 border-t border-[#e8e8e4] pt-2">
                <div>
                  <Label>URL</Label>
                  <CodeBlock>{log.url}</CodeBlock>
                </div>
                {log.requestBody !== undefined && (
                  <div>
                    <Label>Request Body</Label>
                    <CodeBlock maxHeight="max-h-40">
                      {JSON.stringify(log.requestBody, null, 2)}
                    </CodeBlock>
                  </div>
                )}
                {(log.status != null || log.statusText) && (
                  <div>
                    <Label>Response</Label>
                    <CodeBlock>
                      {`${log.status ?? ""} ${log.statusText ?? ""}`.trim()}
                    </CodeBlock>
                  </div>
                )}
                {mcpCalls.length > 0 && (
                  <div>
                    <Label>MCP 调用 ({mcpCalls.length})</Label>
                    <div className="space-y-1.5">
                      {mcpCalls.map((call, i) => (
                        <McpCallBlock key={`${call.name}-${i}`} call={call} />
                      ))}
                    </div>
                  </div>
                )}
                {otherEvents.length > 0 && (
                  <div>
                    <Label>其他 SSE ({otherEvents.length})</Label>
                    <CodeBlock maxHeight="max-h-48">
                      {JSON.stringify(otherEvents, null, 2)}
                    </CodeBlock>
                  </div>
                )}
                {log.error && (
                  <div>
                    <Label>Error</Label>
                    <CodeBlock>{log.error}</CodeBlock>
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
