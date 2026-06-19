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
import { MemoryConversationStore } from "../store/memory.js";
import { analyzeIntent } from "./analyzer.js";

export class AgentPipeline {
  private contextEngine: ContextEngine;

  constructor(
    private config: AppConfig,
    private mcp: Dida365McpClient,
    private store: MemoryConversationStore,
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
      if (!this.config.llmApiKey || !this.config.dida365Token) {
        onEvent({
          type: "error",
          message: "请先在设置中配置 LLM API Key 和滴答清单 Token",
        });
        return;
      }

      await this.mcp.connect();

      this.store.appendMessage(sessionId, { role: "user", content: userMessage });

      const analysis = await analyzeIntent(this.config, userMessage);
      const snapshot = await this.contextEngine.build(analysis, userMessage);
      const contextPrompt = this.contextEngine.snapshotToPrompt(
        snapshot,
        analysis,
      );
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
