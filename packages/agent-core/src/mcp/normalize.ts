export function parseMcpToolContent(content: unknown): unknown {
  if (Array.isArray(content)) {
    const text = content.find((c: { type?: string; text?: string }) => c.type === "text")?.text;
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
  }
  if (content && typeof content === "object" && "content" in content) {
    return parseMcpToolContent((content as { content: unknown }).content);
  }
  return content;
}

export function normalizeToolListResult(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.result)) return obj.result;
    if (Array.isArray(obj.projects)) return obj.projects;
    if (Array.isArray(obj.tasks)) return obj.tasks;
  }
  return [];
}
