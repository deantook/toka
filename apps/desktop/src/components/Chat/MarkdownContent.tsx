import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface Props {
  content: string;
  variant: "user" | "assistant";
}

export function MarkdownContent({ content, variant }: Props) {
  const isUser = variant === "user";

  const components: Components = {
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={isUser ? "underline text-white/95" : "text-[#5c5c58] underline underline-offset-2"}
      >
        {children}
      </a>
    ),
    code: ({ className, children }) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return <code className={className}>{children}</code>;
      }
      return (
        <code
          className={
            isUser
              ? "rounded px-1 py-0.5 bg-white/20 font-mono text-[0.85em]"
              : "rounded px-1 py-0.5 bg-slate-200/80 font-mono text-[0.85em] text-slate-800"
          }
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre
        className={
          isUser
            ? "my-2 overflow-x-auto rounded-lg bg-white/15 p-3 text-xs font-mono"
            : "my-2 overflow-x-auto rounded-lg bg-slate-200/70 p-3 text-xs font-mono text-slate-800"
        }
      >
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="my-2 overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th
        className={
          isUser
            ? "border border-white/30 px-2 py-1 text-left font-semibold"
            : "border border-slate-300 px-2 py-1 text-left font-semibold bg-slate-200/50"
        }
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td
        className={
          isUser
            ? "border border-white/30 px-2 py-1"
            : "border border-slate-300 px-2 py-1"
        }
      >
        {children}
      </td>
    ),
  };

  return (
    <div className={`markdown markdown-${variant}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
