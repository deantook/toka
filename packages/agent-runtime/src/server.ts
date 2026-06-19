import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Dida365McpClient, type AppConfig } from "@toka/agent-core";
import { AgentPipeline } from "./pipeline/pipeline.js";
import { ConversationStore } from "./store/conversations.js";

const PORT = Number(process.env.TOKA_AGENT_PORT ?? 17200);
const PORT_FILE = path.join(os.tmpdir(), "toka-agent.port");

let config: AppConfig = {
  llmBaseUrl: process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1",
  llmApiKey: process.env.LLM_API_KEY?.trim() ?? "",
  llmModel: process.env.LLM_MODEL?.trim() || "gpt-4o-mini",
  dida365Token: process.env.DIDA365_TOKEN?.trim() ?? "",
  dida365McpUrl: process.env.DIDA365_MCP_URL?.trim() || "https://mcp.dida365.com",
};

const mcp = new Dida365McpClient(config);
const store = new ConversationStore();
const pipeline = new AgentPipeline(config, mcp, store);

function applyConfig(partial: Partial<AppConfig>): AppConfig {
  config = {
    ...config,
    ...partial,
    llmBaseUrl: (partial.llmBaseUrl ?? config.llmBaseUrl).trim(),
    llmApiKey: (partial.llmApiKey ?? config.llmApiKey).trim(),
    llmModel: (partial.llmModel ?? config.llmModel).trim(),
    dida365Token: (partial.dida365Token ?? config.dida365Token).trim(),
    dida365McpUrl: (
      partial.dida365McpUrl ??
      config.dida365McpUrl ??
      "https://mcp.dida365.com"
    ).trim(),
  };
  pipeline.updateConfig(config);
  return config;
}

const app = new Hono();

app.use("*", cors());

app.get("/health", (c) => {
  return c.json({ status: "ok", port: PORT });
});

app.get("/api/config/status", (c) => {
  return c.json({
    hasLlmKey: Boolean(config.llmApiKey),
    hasDidaToken: Boolean(config.dida365Token),
    llmBaseUrl: config.llmBaseUrl,
    llmModel: config.llmModel,
  });
});

app.post("/api/config", async (c) => {
  const body = (await c.req.json()) as Partial<AppConfig>;
  applyConfig(body);
  return c.json({
    ok: true,
    hasDidaToken: Boolean(config.dida365Token),
    hasLlmKey: Boolean(config.llmApiKey),
  });
});

app.post("/api/config/test", async (c) => {
  if (!config.dida365Token) {
    return c.json({
      ok: false,
      message: "未配置滴答 Token。请在设置中填写（格式 dp_...）",
    });
  }
  try {
    await mcp.connect();
    const ok = await mcp.healthCheck();
    return c.json({ ok, message: ok ? "滴答清单连接成功" : "连接失败" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const hint = message.includes("invalid_token")
      ? "Token 无效或已过期，请重新生成并保存"
      : message;
    return c.json({ ok: false, message: hint });
  }
});

app.get("/api/tasks", async (c) => {
  const range = c.req.query("range");
  if (range !== "today" && range !== "week") {
    return c.json({ error: "range must be today or week" }, 400);
  }
  try {
    const tasks = await pipeline.fetchTasksForSchedule(range);
    return c.json({ tasks });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

app.get("/api/sessions", (c) => {
  return c.json({ sessions: store.listSessions() });
});

app.post("/api/sessions", (c) => {
  const session = store.createSession();
  return c.json({ session });
});

app.delete("/api/sessions", (c) => {
  store.clearAll();
  return c.json({ ok: true });
});

app.get("/api/history/:sessionId", (c) => {
  const sessionId = c.req.param("sessionId");
  store.ensureSession(sessionId);
  return c.json({ messages: store.getMessages(sessionId) });
});

app.delete("/api/sessions/:id", (c) => {
  const sessionId = c.req.param("id");
  store.clear(sessionId);
  return c.json({ ok: true });
});

app.post("/api/chat", async (c) => {
  const body = (await c.req.json()) as {
    sessionId?: string;
    message: string;
  };
  const sessionId = body.sessionId ?? "default";

  return streamSSE(c, async (stream) => {
    await pipeline.run(sessionId, body.message, async (event) => {
      await stream.writeSSE({ data: JSON.stringify(event) });
    });
  });
});

serve({ fetch: app.fetch, port: PORT }, () => {
  fs.writeFileSync(PORT_FILE, String(PORT));
  console.log(`Toka agent sidecar listening on http://127.0.0.1:${PORT}`);
});

export { PORT, PORT_FILE };
