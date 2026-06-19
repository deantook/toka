function parseTextItem(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function parseMcpToolContent(content: unknown): unknown {
  if (Array.isArray(content)) {
    const textItems = content
      .filter(
        (c): c is { type: string; text: string } =>
          typeof c === "object" &&
          c !== null &&
          (c as { type?: string }).type === "text" &&
          typeof (c as { text?: string }).text === "string",
      )
      .map((c) => c.text);

    if (textItems.length === 0) {
      return content;
    }

    const parsed = textItems.map(parseTextItem);
    return parsed.length === 1 ? parsed[0] : parsed;
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

/** Align argument names with dida365 MCP schemas before tools/call. */
export function normalizeToolArguments(
  name: string,
  args: Record<string, unknown>,
): Record<string, unknown> {
  if (name === "search_task") {
    if (args.query == null && args.keyword != null) {
      const { keyword, ...rest } = args;
      return { ...rest, query: keyword };
    }
  }
  return args;
}
