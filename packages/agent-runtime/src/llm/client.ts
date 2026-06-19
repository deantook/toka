import OpenAI from "openai";
import type { AppConfig } from "@toka/agent-core";

export function createLlmClient(config: AppConfig): OpenAI {
  return new OpenAI({
    apiKey: config.llmApiKey,
    baseURL: config.llmBaseUrl || undefined,
  });
}
