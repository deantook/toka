export const DEFAULT_AGENT_URL = "http://127.0.0.1:17200";

export interface AppliedAction {
  type: "create" | "update" | "complete" | "delete" | "move";
  taskTitle: string;
  detail: string;
}

export interface SseEvent {
  type: string;
  delta?: string;
  name?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  message?: string;
  mcpUrl?: string;
  request?: {
    method: string;
    name: string;
    arguments: Record<string, unknown>;
  };
  response?: { raw: unknown; parsed: unknown };
  error?: string;
  durationMs?: number;
  actions?: AppliedAction[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: { name: string; args?: Record<string, unknown>; result?: unknown }[];
}

export interface RequestLogEntry {
  id: string;
  timestamp: string;
  label: string;
  method: string;
  url: string;
  requestBody?: unknown;
  status?: number;
  statusText?: string;
  durationMs?: number;
  sseEvents?: SseEvent[];
  error?: string;
}

export interface SessionMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppCredentials {
  llmApiKey: string;
  dida365Token: string;
  llmBaseUrl: string;
  llmModel: string;
  dida365McpUrl: string;
}
