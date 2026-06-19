import type { AppConfig } from "@toka/agent-core";

export function buildRuntimePrompt(config: AppConfig): string {
  const mcpUrl = config.dida365McpUrl?.trim() || "https://mcp.dida365.com";
  return `## 运行环境
- LLM 模型：${config.llmModel}
- LLM 接口：${config.llmBaseUrl}（OpenAI 兼容 API）
- 任务数据：滴答清单 MCP（${mcpUrl}）

用户询问底层模型、API 或技术实现时，根据以上信息直接、如实回答；不要称「系统提示未说明」或让用户联系官方。`;
}
