import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { AppConfig } from "../types.js";
import { MVP_TOOLS } from "../types.js";
import { parseMcpToolContent } from "./normalize.js";

export interface McpCallLog {
  name: string;
  mcpUrl: string;
  request: {
    method: "tools/call";
    name: string;
    arguments: Record<string, unknown>;
  };
  response?: { raw: unknown; parsed: unknown };
  error?: string;
  durationMs: number;
}

export type McpCallObserver = (log: McpCallLog) => void;

export class Dida365McpClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private toolSchemas = new Map<string, Record<string, unknown>>();
  private callObserver: McpCallObserver | null = null;

  constructor(private config: AppConfig) {}

  setCallObserver(observer: McpCallObserver | null): void {
    this.callObserver = observer;
  }

  private mcpUrl(): string {
    return this.config.dida365McpUrl?.trim() || "https://mcp.dida365.com";
  }

  private normalizedToken(): string {
    return this.config.dida365Token.trim();
  }

  async connect(): Promise<void> {
    const token = this.normalizedToken();
    if (!token) {
      throw new Error(
        "未配置滴答清单 Token。请在设置中填写 Token（格式 dp_...，可在滴答开发者设置中获取）",
      );
    }

    if (this.client) {
      await this.disconnect();
    }

    const url = this.mcpUrl();
    this.transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    this.client = new Client(
      { name: "toka-agent", version: "0.1.0" },
      { capabilities: {} },
    );

    await this.client.connect(this.transport);
    await this.refreshTools();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    this.transport = null;
    this.toolSchemas.clear();
  }

  async refreshTools(): Promise<void> {
    const client = this.requireClient();
    const { tools } = await client.listTools();
    this.toolSchemas.clear();
    for (const tool of tools) {
      if ((MVP_TOOLS as readonly string[]).includes(tool.name)) {
        this.toolSchemas.set(tool.name, {
          type: "function",
          function: {
            name: tool.name,
            description: tool.description ?? tool.name,
            parameters: tool.inputSchema ?? { type: "object", properties: {} },
          },
        });
      }
    }
  }

  getOpenAiTools(): Record<string, unknown>[] {
    return Array.from(this.toolSchemas.values());
  }

  filterOpenAiTools(names: string[]): Record<string, unknown>[] {
    const allowed = new Set(names);
    return this.getOpenAiTools().filter((tool) => {
      const fn = (tool as { function?: { name?: string } }).function;
      return fn?.name != null && allowed.has(fn.name);
    });
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
    retries = 2,
  ): Promise<unknown> {
    const started = performance.now();
    const request = {
      method: "tools/call" as const,
      name,
      arguments: args,
    };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const { parsed, raw } = await this.callToolOnce(name, args);
        this.callObserver?.({
          name,
          mcpUrl: this.mcpUrl(),
          request,
          response: { raw, parsed },
          durationMs: Math.round(performance.now() - started),
        });
        return parsed;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }

    this.callObserver?.({
      name,
      mcpUrl: this.mcpUrl(),
      request,
      error: lastError?.message ?? `Tool ${name} failed`,
      durationMs: Math.round(performance.now() - started),
    });
    throw lastError ?? new Error(`Tool ${name} failed`);
  }

  private async callToolOnce(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ parsed: unknown; raw: unknown }> {
    const client = this.requireClient();
    const result = await client.callTool({ name, arguments: args });
    const raw = {
      isError: result.isError ?? false,
      content: result.content ?? null,
    };

    if (result.isError) {
      const content = Array.isArray(result.content) ? result.content : [];
      const text = content
        .map((c: { type?: string; text?: string }) =>
          c.type === "text" && c.text ? c.text : JSON.stringify(c),
        )
        .join("\n");
      throw new Error(text || `Tool ${name} failed`);
    }

    const content = Array.isArray(result.content) ? result.content : [];
    return { parsed: parseMcpToolContent(content), raw };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.callTool("list_projects", {});
      return true;
    } catch {
      return false;
    }
  }

  updateConfig(config: AppConfig): void {
    const tokenChanged =
      config.dida365Token.trim() !== this.config.dida365Token.trim();
    this.config = {
      ...config,
      dida365Token: config.dida365Token.trim(),
      llmApiKey: config.llmApiKey.trim(),
    };
    if (tokenChanged) {
      void this.disconnect();
    }
  }

  private requireClient(): Client {
    if (!this.client) {
      throw new Error("MCP client not connected");
    }
    return this.client;
  }
}
