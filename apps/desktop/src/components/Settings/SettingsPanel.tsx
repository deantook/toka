import {
  DIDA365_SETTINGS_LINK_TEXT,
  DIDA365_SETTINGS_URL,
  DIDA365_TOKEN_FORMAT,
  DIDA365_TOKEN_HELP_PATH,
} from "../../constants/dida365";

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
  onClose?: () => void;
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
  onClose,
}: SettingsPanelProps) {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-medium text-[#1c1c1a]">设置</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[#aaa] hover:text-[#5c5c58] text-lg leading-none px-1"
            aria-label="关闭"
          >
            ×
          </button>
        )}
      </div>

      <div className="space-y-4">
        <Field label="LLM Base URL">
          <input
            type="url"
            value={llmBaseUrl}
            onChange={(e) => setLlmBaseUrl(e.target.value)}
            className="field-input"
          />
        </Field>

        <Field label="LLM Model">
          <input
            type="text"
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            placeholder="gpt-4o-mini"
            className="field-input"
          />
        </Field>

        <Field label="LLM API Key">
          <input
            type="text"
            value={llmApiKey}
            onChange={(e) => setLlmApiKey(e.target.value)}
            placeholder="sk-..."
            className="field-input font-mono"
          />
        </Field>

        <Field label="滴答 MCP URL">
          <input
            type="url"
            value={dida365McpUrl}
            onChange={(e) => setDida365McpUrl(e.target.value)}
            className="field-input font-mono"
          />
        </Field>

        <Field label="滴答 Token">
          <input
            type="text"
            value={dida365Token}
            onChange={(e) => setDida365Token(e.target.value)}
            placeholder={DIDA365_TOKEN_FORMAT}
            className="field-input font-mono"
          />
          <p className="text-[11px] text-[#8a8a86] mt-1.5 leading-relaxed">
            请在浏览器中打开{" "}
            <a
              href={DIDA365_SETTINGS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-[#5c5c58]"
            >
              {DIDA365_SETTINGS_LINK_TEXT}
            </a>
            ，进入「{DIDA365_TOKEN_HELP_PATH}」，复制 API 口令（格式 {DIDA365_TOKEN_FORMAT}）粘贴到此处。
          </p>
        </Field>

        <label className="flex items-center gap-2.5 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
            className="rounded border-[#ccc]"
          />
          <span className="text-[13px] text-[#3d3d3a]">调试模式</span>
        </label>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-1.5 text-[13px] bg-[#1c1c1a] text-[#fafaf8] hover:bg-[#3d3d3a] disabled:opacity-50 transition-colors"
          >
            {saving ? "保存中…" : "保存"}
          </button>
          <button
            type="button"
            onClick={testConnection}
            className="px-4 py-1.5 text-[13px] border border-[#dcdcd8] text-[#5c5c58] hover:bg-[#f0f0ec] transition-colors"
          >
            测试连接
          </button>
        </div>

        {testResult && (
          <p className="text-[12px] text-[#5c5c58] bg-[#f0f0ec] px-3 py-2 leading-relaxed">
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
      <span className="text-[12px] text-[#8a8a86]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
