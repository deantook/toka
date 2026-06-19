interface SettingsPanelProps {
  llmApiKey: string;
  setLlmApiKey: (v: string) => void;
  dida365Token: string;
  setDida365Token: (v: string) => void;
  llmBaseUrl: string;
  setLlmBaseUrl: (v: string) => void;
  llmModel: string;
  setLlmModel: (v: string) => void;
  dida365McpUrl: string;
  setDida365McpUrl: (v: string) => void;
  debugMode: boolean;
  setDebugMode: (v: boolean) => void;
  saving: boolean;
  save: () => void;
  testConnection: () => void;
  testResult: string | null;
}

export function SettingsPanel({
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
}: SettingsPanelProps) {
  return (
    <div className="max-w-lg mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">设置</h2>

      <p className="mb-4 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        API Key 与 Token 保存在本地 settings.json 中。
      </p>

      <div className="space-y-4">
        <Field label="LLM Base URL">
          <input
            type="url"
            value={llmBaseUrl}
            onChange={(e) => setLlmBaseUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
          />
        </Field>

        <Field label="LLM Model">
          <input
            type="text"
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            placeholder="如 gpt-4o-mini"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>

        <Field label="LLM API Key">
          <input
            type="text"
            value={llmApiKey}
            onChange={(e) => setLlmApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
          />
        </Field>

        <Field label="滴答 MCP URL">
          <input
            type="url"
            value={dida365McpUrl}
            onChange={(e) => setDida365McpUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
          />
        </Field>

        <Field label="滴答 Token">
          <input
            type="text"
            value={dida365Token}
            onChange={(e) => setDida365Token(e.target.value)}
            placeholder="dp_..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
          />
        </Field>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-slate-700">调试模式（显示 MCP 请求日志）</span>
        </label>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg disabled:opacity-50 hover:bg-indigo-700"
          >
            {saving ? "保存中..." : "保存并重启 Agent"}
          </button>
          <button
            type="button"
            onClick={testConnection}
            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
          >
            测试滴答连接
          </button>
        </div>

        {testResult && (
          <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
            {testResult}
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
