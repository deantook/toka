import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SessionMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionRecord extends SessionMeta {
  messages: StoredMessage[];
}

interface StoreData {
  sessions: Record<string, SessionRecord>;
}

const DEFAULT_TITLE = "新对话";

function truncateTitle(text: string, max = 32): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export class ConversationStore {
  private data: StoreData = { sessions: {} };
  private readonly filePath: string;
  private dirty = false;

  constructor(filePath?: string) {
    this.filePath =
      filePath ??
      path.join(os.homedir(), ".toka", "conversations.json");
    this.load();
  }

  private load(): void {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as StoreData;
      if (parsed?.sessions && typeof parsed.sessions === "object") {
        this.data = parsed;
      }
    } catch {
      this.data = { sessions: {} };
    }
  }

  private persist(): void {
    if (!this.dirty) return;
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
    this.dirty = false;
  }

  listSessions(): SessionMeta[] {
    return Object.values(this.data.sessions)
      .map(({ id, title, createdAt, updatedAt }) => ({
        id,
        title,
        createdAt,
        updatedAt,
      }))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }

  getMessages(sessionId: string): StoredMessage[] {
    return this.data.sessions[sessionId]?.messages ?? [];
  }

  createSession(): SessionMeta {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const session: SessionRecord = {
      id,
      title: DEFAULT_TITLE,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    this.data.sessions[id] = session;
    this.dirty = true;
    this.persist();
    return { id, title: session.title, createdAt: now, updatedAt: now };
  }

  ensureSession(sessionId: string): SessionMeta {
    const existing = this.data.sessions[sessionId];
    if (existing) {
      return {
        id: existing.id,
        title: existing.title,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      };
    }

    const now = new Date().toISOString();
    const session: SessionRecord = {
      id: sessionId,
      title: DEFAULT_TITLE,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    this.data.sessions[sessionId] = session;
    this.dirty = true;
    this.persist();
    return { id: sessionId, title: session.title, createdAt: now, updatedAt: now };
  }

  appendMessage(sessionId: string, msg: StoredMessage): void {
    const session = this.data.sessions[sessionId] ?? {
      id: sessionId,
      title: DEFAULT_TITLE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    if (msg.role === "user" && session.title === DEFAULT_TITLE) {
      session.title = truncateTitle(msg.content);
    }

    session.messages.push(msg);
    session.updatedAt = new Date().toISOString();
    this.data.sessions[sessionId] = session;
    this.dirty = true;
    this.persist();
  }

  clear(sessionId: string): void {
    if (!this.data.sessions[sessionId]) return;
    delete this.data.sessions[sessionId];
    this.dirty = true;
    this.persist();
  }

  clearAll(): void {
    if (Object.keys(this.data.sessions).length === 0) return;
    this.data = { sessions: {} };
    this.dirty = true;
    this.persist();
  }
}
