import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { ChatMessage } from "../../types";
import { MarkdownContent } from "./MarkdownContent";
import { ToolTrace } from "./ToolTrace";

export interface ChatPanelHandle {
  setInput: (text: string) => void;
}

interface Props {
  messages: ChatMessage[];
  streaming: boolean;
  debugMode?: boolean;
  onSend: (text: string) => void;
  onClear: () => void;
}

const QUICK_ACTIONS = [
  { label: "今天有什么事", text: "今天有什么事" },
  { label: "本周待办", text: "本周待办" },
  { label: "做个回顾", text: "做个回顾" },
] as const;

export const ChatPanel = forwardRef<ChatPanelHandle, Props>(function ChatPanel(
  { messages, streaming, debugMode = false, onSend, onClear },
  ref,
) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    setInput: (text: string) => {
      setInput(text);
      inputRef.current?.focus();
    },
  }));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  const handleQuickAction = (text: string) => {
    if (streaming) return;
    onSend(text);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-slate-800">对话</h2>
          {debugMode && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
              调试模式
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          清空历史
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-8">
            试试快捷指令，或直接输入你的需求
          </p>
        )}
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          const isEmptyAssistant =
            !isUser && !msg.content && streaming && i === messages.length - 1;

          return (
            <div
              key={i}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  isUser
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {isEmptyAssistant ? (
                  <span className="text-slate-400">...</span>
                ) : msg.content ? (
                  <MarkdownContent
                    content={msg.content}
                    variant={isUser ? "user" : "assistant"}
                  />
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
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pt-3 border-t border-slate-100">
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleQuickAction(action.text)}
              disabled={streaming}
              className="px-3 py-1.5 text-xs rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-50 transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 pt-0 border-t border-slate-100">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            disabled={streaming}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg disabled:opacity-50 hover:bg-indigo-700"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
});
