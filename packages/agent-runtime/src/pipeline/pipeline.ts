import type {
  AppConfig,
  Dida365McpClient,
  SseEvent,
  TaskSummary,
} from "@toka/agent-core";
import {
  ContextEngine,
  DOMAIN_RULES_TEXT,
  fetchUndoneTasksInRange,
  resolveDateRangeFromMessage,
} from "@toka/agent-core";
import { ROLE_TOOLS, composeSystemPrompt } from "@toka/agent-roles";
import { runToolLoop } from "../llm/tool-loop.js";
import { ConversationStore } from "../store/conversations.js";
import { analyzeIntent } from "./analyzer.js";
import { buildRuntimePrompt } from "./runtime-context.js";

export class AgentPipeline {
  private contextEngine: ContextEngine;

  constructor(
    private config: AppConfig,
    private mcp: Dida365McpClient,
    private store: ConversationStore,
  ) {
    this.contextEngine = new ContextEngine(mcp);
  }

  updateConfig(config: AppConfig): void {
    this.config = config;
    this.mcp.updateConfig(config);
  }

  private attachMcpLogging(onEvent: (event: SseEvent) => void): () => void {
    this.mcp.setCallObserver((log) => {
      onEvent({
        type: "mcp_call",
        name: log.name,
        mcpUrl: log.mcpUrl,
        request: log.request,
        response: log.response,
        error: log.error,
        durationMs: log.durationMs,
      });
    });
    return () => this.mcp.setCallObserver(null);
  }

  async run(
    sessionId: string,
    userMessage: string,
    onEvent: (event: SseEvent) => void,
  ): Promise<void> {
    const detachMcpLogging = onEvent ? this.attachMcpLogging(onEvent) : () => {};
    try {
      if (!this.config.dida365Token) {
        onEvent({
          type: "error",
          message:
            "尚未配置滴答清单 Token。请前往「设置」填写 Token（格式 dp_...，在浏览器中打开滴答清单 → 设置 → 账户与安全 → API 口令管理中获取）",
        });
        return;
      }
      if (!this.config.llmApiKey) {
        onEvent({
          type: "error",
          message: "尚未配置 LLM API Key。请前往「设置」填写后再试",
        });
        return;
      }

      await this.mcp.connect();

      this.store.ensureSession(sessionId);

      this.store.appendMessage(sessionId, { role: "user", content: userMessage });

      const analysis = await analyzeIntent(this.config, userMessage);
      const snapshot = await this.contextEngine.build(analysis, userMessage);
      const contextPrompt = [
        buildRuntimePrompt(this.config),
        this.contextEngine.snapshotToPrompt(snapshot, analysis),
      ].join("\n\n");
      const systemPrompt = composeSystemPrompt(
        analysis.role,
        contextPrompt,
        DOMAIN_RULES_TEXT,
      );

      const history = this.store.getMessages(sessionId).slice(-20);
      const messages = history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const { content, actions } = await runToolLoop({
        config: this.config,
        mcp: this.mcp,
        systemPrompt,
        messages,
        onEvent,
        toolNames: [...ROLE_TOOLS[analysis.role]],
      });

      if (actions.length > 0) {
        onEvent({ type: "actions_applied", actions });
      }

      this.store.appendMessage(sessionId, { role: "assistant", content });
      onEvent({ type: "done", message: content });
    } catch (err) {
      onEvent({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      detachMcpLogging();
    }
  }

  async fetchTasksForSchedule(
    range: "today" | "week",
  ): Promise<TaskSummary[]> {
    await this.mcp.connect();
    const message = range === "today" ? "今天" : "本周";
    const resolved = resolveDateRangeFromMessage(message);
    if (!resolved) {
      return [];
    }
    const tasks = await fetchUndoneTasksInRange(
      (name, args) => this.mcp.callTool(name, args),
      resolved.start,
      resolved.end,
    );
    return tasks as TaskSummary[];
  }
}
