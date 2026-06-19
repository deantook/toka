import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppliedAction, ChatMessage, RequestLogEntry, SseEvent } from "../types";
import { DEFAULT_AGENT_URL } from "../types";

function createLogEntry(
  partial: Omit<RequestLogEntry, "id" | "timestamp">,
): RequestLogEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...partial,
  };
}

interface UseAgentOptions {
  debugMode: boolean;
}

export function useAgent({ debugMode }: UseAgentOptions) {
  const [agentUrl, setAgentUrl] = useState(DEFAULT_AGENT_URL);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [requestLogs, setRequestLogs] = useState<RequestLogEntry[]>([]);
  const [actionsApplied, setActionsApplied] = useState<AppliedAction[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const sessionId = useRef("default");
  const debugModeRef = useRef(debugMode);

  useEffect(() => {
    debugModeRef.current = debugMode;
  }, [debugMode]);

  useEffect(() => {
    invoke<string>("get_agent_url")
      .then(setAgentUrl)
      .catch(() => setAgentUrl(DEFAULT_AGENT_URL));
  }, []);

  const appendRequestLog = useCallback((entry: RequestLogEntry) => {
    if (!debugModeRef.current) return;
    setRequestLogs((prev) => [entry, ...prev].slice(0, 200));
  }, []);

  const handleEvent = useCallback((event: SseEvent, appendToLast: boolean) => {
    switch (event.type) {
      case "text_delta":
        setMessages((prev) => {
          const next = [...prev];
          if (appendToLast && next.length > 0 && next[next.length - 1].role === "assistant") {
            next[next.length - 1] = {
              ...next[next.length - 1],
              content: next[next.length - 1].content + (event.delta ?? ""),
            };
          } else {
            next.push({ role: "assistant", content: event.delta ?? "" });
          }
          return next;
        });
        break;
      case "tool_start":
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            const toolCalls = [...(last.toolCalls ?? [])];
            toolCalls.push({ name: event.name ?? "", args: event.args });
            next[next.length - 1] = { ...last, toolCalls };
          }
          return next;
        });
        break;
      case "tool_end":
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant" && last.toolCalls?.length) {
            const toolCalls = [...last.toolCalls];
            const idx = toolCalls.findIndex(
              (t) => t.name === event.name && t.result === undefined,
            );
            if (idx >= 0) {
              toolCalls[idx] = { ...toolCalls[idx], result: event.result };
            }
            next[next.length - 1] = { ...last, toolCalls };
          }
          return next;
        });
        break;
      case "actions_applied":
        if (event.actions?.length) {
          setActionsApplied((prev) => [...prev, ...event.actions!]);
        }
        break;
      case "done":
        setRefreshKey((k) => k + 1);
        break;
      case "error":
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `错误: ${event.message}` },
        ]);
        break;
    }
  }, []);

  const parseSseStream = useCallback(
    async (
      response: Response,
      appendToLast: boolean,
      sseEvents?: SseEvent[],
    ) => {
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const event = JSON.parse(raw) as SseEvent;
            sseEvents?.push(event);
            handleEvent(event, appendToLast);
          } catch {
            // ignore parse errors
          }
        }
      }
    },
    [handleEvent],
  );

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const url = `${agentUrl}/api/chat`;
    const requestBody = {
      sessionId: sessionId.current,
      message: text,
    };
    const sseEvents: SseEvent[] = [];
    const started = performance.now();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      await parseSseStream(response, true, sseEvents);
      appendRequestLog(
        createLogEntry({
          label: "chat",
          method: "POST",
          url,
          requestBody,
          status: response.status,
          statusText: response.statusText,
          durationMs: Math.round(performance.now() - started),
          sseEvents,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      appendRequestLog(
        createLogEntry({
          label: "chat",
          method: "POST",
          url,
          requestBody,
          durationMs: Math.round(performance.now() - started),
          sseEvents,
          error: message,
        }),
      );
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: `连接 Agent 失败: ${message}`,
        },
      ]);
    } finally {
      setStreaming(false);
    }
  };

  const clearHistory = async () => {
    const url = `${agentUrl}/api/sessions/${sessionId.current}`;
    const started = performance.now();

    try {
      const response = await fetch(url, { method: "DELETE" });
      appendRequestLog(
        createLogEntry({
          label: "clear-history",
          method: "DELETE",
          url,
          status: response.status,
          statusText: response.statusText,
          durationMs: Math.round(performance.now() - started),
        }),
      );
      setMessages([]);
      setActionsApplied([]);
    } catch (err) {
      appendRequestLog(
        createLogEntry({
          label: "clear-history",
          method: "DELETE",
          url,
          durationMs: Math.round(performance.now() - started),
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  };

  const clearRequestLogs = () => {
    setRequestLogs([]);
  };

  return {
    messages,
    streaming,
    requestLogs,
    actionsApplied,
    refreshKey,
    sendMessage,
    clearHistory,
    clearRequestLogs,
    agentUrl,
  };
}
