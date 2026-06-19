import { useEffect, useRef, useState } from "react";
import {
  DIDA365_SETTINGS_LINK_TEXT,
  DIDA365_SETTINGS_URL,
  DIDA365_TOKEN_FORMAT,
  DIDA365_TOKEN_HELP_PATH,
} from "../../constants/dida365";
import type { ChatMessage } from "../../types";
import { MarkdownContent } from "./MarkdownContent";
import { ToolTrace } from "./ToolTrace";

interface Props {
  messages: ChatMessage[];
  streaming: boolean;
  debugMode?: boolean;
  configReady: boolean;
  missingDidaToken: boolean;
  missingLlmKey: boolean;
  onOpenSettings: () => void;
  onSend: (text: string) => void;
}

const QUICK_ACTIONS = [
  { label: "今天有什么事", text: "今天有什么事" },
  { label: "本周待办", text: "本周待办" },
  { label: "做个回顾", text: "做个回顾" },
] as const;

export function ChatPanel({
  messages,
  streaming,
  debugMode = false,
  configReady,
  missingDidaToken,
  missingLlmKey,
  onOpenSettings,
  onSend,
}: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !streaming) {
        onSend(input.trim());
        setInput("");
      }
    }
  };

  const configHint = missingDidaToken
    ? {
        title: "尚未配置滴答 Token",
        detail: (
          <>
            请在设置中填写 Token（格式 {DIDA365_TOKEN_FORMAT}）。请在浏览器中打开{" "}
            <a
              href={DIDA365_SETTINGS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-[#5c4a2a]"
            >
              {DIDA365_SETTINGS_LINK_TEXT}
            </a>
            ，进入「{DIDA365_TOKEN_HELP_PATH}」获取 API 口令。
          </>
        ),
      }
    : missingLlmKey
      ? {
          title: "尚未配置 LLM API Key",
          detail: "请在设置中填写 API Key。",
        }
      : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {!configReady && configHint && (
        <div className="mx-5 mt-5 px-4 py-3 border border-[#e8dfc8] bg-[#faf6ed] text-[13px]">
          <p className="font-medium text-[#5c4a2a]">{configHint.title}</p>
          <p className="text-[#8a7a5a] mt-1 leading-relaxed">{configHint.detail}</p>
          <button
            type="button"
            onClick={onOpenSettings}
            className="mt-2 text-[12px] text-[#5c5c58] underline underline-offset-2 hover:text-[#1c1c1a]"
          >
            打开设置
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto px-5 py-6">
          {messages.length === 0 && (
            <div className="text-[13px]">
              {configReady ? (
                <>
                  <p className="text-[#1c1c1a] font-medium">
                    说出今天的事，我来帮你理清、安排、复盘
                  </p>
                  <p className="text-[#bbb] mt-2">
                    输入内容，或选择下方快捷操作
                  </p>
                </>
              ) : (
                <p className="text-[#bbb]">完成配置后即可使用</p>
              )}
            </div>
          )}

          <div className="space-y-6">
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const isEmptyAssistant =
                !isUser && !msg.content && streaming && i === messages.length - 1;

              if (isUser) {
                return (
                  <div key={i} className="text-right">
                    <p className="text-[11px] text-[#aaa] mb-1">你</p>
                    <p className="text-[14px] text-[#1c1c1a] leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                );
              }

              return (
                <div key={i}>
                  <p className="text-[11px] text-[#aaa] mb-1.5">回复</p>
                  <div className="text-[14px] text-[#2d2d2a] leading-relaxed border-l-2 border-[#dcdcd8] pl-4">
                    {isEmptyAssistant ? (
                      <span className="text-[#ccc]">处理中…</span>
                    ) : msg.content ? (
                      <MarkdownContent content={msg.content} variant="assistant" />
                    ) : null}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <ToolTrace
                        toolCalls={msg.toolCalls}
                        defaultOpen={debugMode}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-[#e8e8e4] bg-[#fafaf8]">
        <div className="max-w-2xl mx-auto px-5 pt-3">
          <div className="flex gap-4 mb-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => !streaming && configReady && onSend(action.text)}
                disabled={streaming || !configReady}
                className="text-[12px] text-[#aaa] hover:text-[#5c5c58] disabled:opacity-40 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-5 pb-4">
          <div className="flex gap-2 items-end border border-[#dcdcd8] bg-white focus-within:border-[#aaa] transition-colors">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={configReady ? "输入，Enter 发送" : "请先完成设置"}
              disabled={streaming}
              className="flex-1 resize-none px-3 py-2.5 text-[14px] bg-transparent focus:outline-none disabled:text-[#ccc] leading-relaxed"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="shrink-0 px-3 py-2.5 text-[13px] text-[#5c5c58] hover:text-[#1c1c1a] disabled:text-[#ddd] transition-colors"
            >
              发送
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
