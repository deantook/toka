import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type {
  AppliedAction,
  ChatMessage,
  RequestLogEntry,
  SessionMeta,
  SseEvent,
} from "../types";
import { DEFAULT_AGENT_URL } from "../types";

const CURRENT_SESSION_KEY = "toka:current-session";

function createLogEntry(
  partial: Omit<RequestLogEntry, "id" | "timestamp">,
): RequestLogEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...partial,
  };
}

function readStoredSessionId(): string | null {
  try {
    return localStorage.getItem(CURRENT_SESSION_KEY);
  } catch {
    return null;
  }
}

function writeStoredSessionId(sessionId: string): void {
  try {
    localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
  } catch {
    // ignore storage errors
  }
}

async function waitForAgentHealth(
  agentUrl: string,
  attempts = 15,
): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`${agentUrl}/health`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) return true;
    } catch {
      // sidecar still starting
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

interface UseAgentOptions {
  debugMode: boolean;
  hasDidaToken: boolean;
  hasLlmKey: boolean;
}

export function useAgent({ debugMode, hasDidaToken, hasLlmKey }: UseAgentOptions) {
  const [agentUrl, setAgentUrl] = useState(DEFAULT_AGENT_URL);
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [requestLogs, setRequestLogs] = useState<RequestLogEntry[]>([]);
  const [actionsApplied, setActionsApplied] = useState<AppliedAction[]>([]);
  const debugModeRef = useRef(debugMode);
  const currentSessionIdRef = useRef("");

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    debugModeRef.current = debugMode;
  }, [debugMode]);

  useEffect(() => {
    invoke<string>("get_agent_url")
      .then(setAgentUrl)
      .catch(() => setAgentUrl(DEFAULT_AGENT_URL));
  }, []);

  const fetchSessions = useCallback(async (url = agentUrl) => {
    try {
      const res = await fetch(`${url}/api/sessions`);
      if (!res.ok) return null;
      const data = (await res.json()) as { sessions: SessionMeta[] };
      return data.sessions ?? [];
    } catch {
      return null;
    }
  }, [agentUrl]);

  const loadHistory = useCallback(
    async (sessionId: string, url = agentUrl) => {
      try {
        const res = await fetch(`${url}/api/history/${sessionId}`);
        if (!res.ok) {
          setMessages([]);
          return;
        }
        const data = (await res.json()) as { messages: ChatMessage[] };
        setMessages(data.messages ?? []);
      } catch {
        setMessages([]);
      }
    },
    [agentUrl],
  );

  const createSession = useCallback(
    async (url = agentUrl): Promise<SessionMeta | null> => {
      try {
        const res = await fetch(`${url}/api/sessions`, { method: "POST" });
        if (!res.ok) return null;
        const data = (await res.json()) as { session: SessionMeta };
        return data.session;
      } catch {
        return null;
      }
    },
    [agentUrl],
  );

  const resolveSessionId = useCallback(
    async (url = agentUrl): Promise<string> => {
      if (currentSessionIdRef.current) {
        return currentSessionIdRef.current;
      }

      await waitForAgentHealth(url);

      const list = await fetchSessions(url);
      let sessionId = readStoredSessionId();

      if (list) {
        if (sessionId && list.some((s) => s.id === sessionId)) {
          setSessions(list);
          setCurrentSessionId(sessionId);
          writeStoredSessionId(sessionId);
          await loadHistory(sessionId, url);
          return sessionId;
        }

        if (list.length > 0) {
          sessionId = list[0].id;
          setSessions(list);
          setCurrentSessionId(sessionId);
          writeStoredSessionId(sessionId);
          await loadHistory(sessionId, url);
          return sessionId;
        }

        const created = await createSession(url);
        if (created) {
          const refreshed = (await fetchSessions(url)) ?? [created];
          setSessions(refreshed);
          setCurrentSessionId(created.id);
          writeStoredSessionId(created.id);
          return created.id;
        }
      }

      sessionId = sessionId ?? crypto.randomUUID();
      setCurrentSessionId(sessionId);
      writeStoredSessionId(sessionId);
      return sessionId;
    },
    [createSession, fetchSessions, loadHistory],
  );

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!agentUrl || cancelled) return;
      const sessionId = await resolveSessionId(agentUrl);
      if (!cancelled && sessionId) {
        await loadHistory(sessionId, agentUrl);
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [agentUrl, loadHistory, resolveSessionId]);

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
        void fetchSessions().then((list) => {
          if (list) setSessions(list);
        });
        break;
      case "error":
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          const content = event.message ?? "发生未知错误";
          if (last?.role === "assistant" && !last.content) {
            next[next.length - 1] = { ...last, content };
          } else {
            next.push({ role: "assistant", content });
          }
          return next;
        });
        break;
    }
  }, [fetchSessions]);

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

  const configMissingMessage = (): string | null => {
    if (!hasDidaToken) {
      return "尚未配置滴答清单 Token。请前往「设置」填写（格式 dp_...，可在滴答清单 → 设置 → 开发者中获取）";
    }
    if (!hasLlmKey) {
      return "尚未配置 LLM API Key。请前往「设置」填写后再试";
    }
    return null;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;

    const missing = configMissingMessage();
    if (missing) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: missing },
      ]);
      return;
    }

    let sessionId: string;
    try {
      sessionId = await resolveSessionId();
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        {
          role: "assistant",
          content: "Agent 服务未就绪，请稍后重试或重启应用",
        },
      ]);
      return;
    }

    setStreaming(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const url = `${agentUrl}/api/chat`;
    const requestBody = {
      sessionId,
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
      const list = await fetchSessions();
      if (list) setSessions(list);
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

  const switchSession = async (sessionId: string) => {
    if (sessionId === currentSessionId || streaming) return;
    setCurrentSessionId(sessionId);
    writeStoredSessionId(sessionId);
    await loadHistory(sessionId);
  };

  const startNewSession = async () => {
    if (streaming) return;
    const session = await createSession();
    if (session) {
      const list = await fetchSessions();
      setSessions(list ?? [session]);
      setCurrentSessionId(session.id);
      writeStoredSessionId(session.id);
      setMessages([]);
      setActionsApplied([]);
      return;
    }

    const fallbackId = crypto.randomUUID();
    setCurrentSessionId(fallbackId);
    writeStoredSessionId(fallbackId);
    setMessages([]);
    setActionsApplied([]);
  };

  const deleteSession = async (sessionId: string) => {
    if (streaming) return;

    const url = `${agentUrl}/api/sessions/${sessionId}`;
    try {
      await fetch(url, { method: "DELETE" });
    } catch {
      return;
    }

    const list = await fetchSessions();
    if (list) setSessions(list);

    if (sessionId !== currentSessionId) return;

    if (list && list.length > 0) {
      await switchSession(list[0].id);
      return;
    }

    const session = await createSession();
    if (!session) {
      const fallbackId = crypto.randomUUID();
      setCurrentSessionId(fallbackId);
      writeStoredSessionId(fallbackId);
      setMessages([]);
      return;
    }
    setSessions((await fetchSessions()) ?? [session]);
    setCurrentSessionId(session.id);
    writeStoredSessionId(session.id);
    setMessages([]);
  };

  const clearAllSessions = async (): Promise<boolean> => {
    if (streaming) return false;

    const url = `${agentUrl}/api/sessions`;
    const started = performance.now();

    try {
      let response = await fetch(url, { method: "DELETE" });

      if (!response.ok && response.status === 404) {
        const list = await fetchSessions();
        if (list?.length) {
          await Promise.all(
            list.map((s) =>
              fetch(`${agentUrl}/api/sessions/${s.id}`, { method: "DELETE" }),
            ),
          );
        }
      } else if (!response.ok) {
        return false;
      }

      appendRequestLog(
        createLogEntry({
          label: "clear-all-sessions",
          method: "DELETE",
          url,
          status: response.status,
          statusText: response.statusText,
          durationMs: Math.round(performance.now() - started),
        }),
      );

      setMessages([]);
      setActionsApplied([]);

      const session = await createSession();
      if (session) {
        setSessions((await fetchSessions()) ?? [session]);
        setCurrentSessionId(session.id);
        writeStoredSessionId(session.id);
        return true;
      }

      const fallbackId = crypto.randomUUID();
      setCurrentSessionId(fallbackId);
      writeStoredSessionId(fallbackId);
      setSessions([]);
      return true;
    } catch (err) {
      appendRequestLog(
        createLogEntry({
          label: "clear-all-sessions",
          method: "DELETE",
          url,
          durationMs: Math.round(performance.now() - started),
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      return false;
    }
  };

  const clearRequestLogs = () => {
    setRequestLogs([]);
  };

  return {
    messages,
    streaming,
    sessions,
    currentSessionId,
    requestLogs,
    actionsApplied,
    sendMessage,
    switchSession,
    startNewSession,
    deleteSession,
    clearAllSessions,
    clearRequestLogs,
    agentUrl,
    configReady: hasDidaToken && hasLlmKey,
    missingDidaToken: !hasDidaToken,
    missingLlmKey: !hasLlmKey,
  };
}
