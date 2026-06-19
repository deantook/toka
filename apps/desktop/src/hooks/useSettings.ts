import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppCredentials } from "../types";
import { DEFAULT_AGENT_URL } from "../types";

const DEBUG_STORAGE_KEY = "toka:debug";

function readDebugMode(): boolean {
  try {
    return localStorage.getItem(DEBUG_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function useSettings() {
  const [llmApiKey, setLlmApiKey] = useState("");
  const [dida365Token, setDida365Token] = useState("");
  const [llmBaseUrl, setLlmBaseUrl] = useState("https://api.openai.com/v1");
  const [llmModel, setLlmModel] = useState("gpt-4o-mini");
  const [dida365McpUrl, setDida365McpUrl] = useState("https://mcp.dida365.com");
  const [debugMode, setDebugModeState] = useState(readDebugMode);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [agentUrl, setAgentUrl] = useState(DEFAULT_AGENT_URL);

  const setDebugMode = useCallback((value: boolean) => {
    setDebugModeState(value);
    try {
      localStorage.setItem(DEBUG_STORAGE_KEY, String(value));
    } catch {
      // ignore storage errors
    }
  }, []);

  const load = useCallback(async () => {
    const data = await invoke<AppCredentials>("get_credentials");
    setLlmApiKey(data.llmApiKey);
    setDida365Token(data.dida365Token);
    setLlmBaseUrl(data.llmBaseUrl);
    setLlmModel(data.llmModel);
    setDida365McpUrl(data.dida365McpUrl);
    const url = await invoke<string>("get_agent_url");
    setAgentUrl(url);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      await invoke("save_credentials", {
        llmApiKey,
        dida365Token,
        llmBaseUrl,
        llmModel,
        dida365McpUrl,
      });

      const configRes = await fetch(`${agentUrl}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llmApiKey,
          dida365Token,
          llmBaseUrl,
          llmModel,
          dida365McpUrl,
        }),
      });
      if (!configRes.ok) {
        throw new Error(`同步配置失败 (${configRes.status})`);
      }

      await load();
      try {
        await invoke("restart_sidecar");
        setTestResult("设置已保存，Agent 已重启");
      } catch (restartErr) {
        setTestResult(
          `设置已保存，但 Agent 重启失败: ${restartErr instanceof Error ? restartErr.message : String(restartErr)}`,
        );
      }
    } catch (err) {
      setTestResult(`保存失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTestResult(null);
    try {
      const res = await fetch(`${agentUrl}/api/config/test`, { method: "POST" });
      const data = (await res.json()) as { ok: boolean; message: string };
      setTestResult(data.message);
    } catch (err) {
      setTestResult(`测试失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return {
    llmApiKey,
    setLlmApiKey,
    dida365Token,
    setDida365Token,
    llmBaseUrl,
    setLlmBaseUrl,
    llmModel,
    setLlmModel,
    dida365McpUrl,
    setDida365McpUrl,
    debugMode,
    setDebugMode,
    saving,
    save,
    testConnection,
    testResult,
    agentUrl,
  };
}
