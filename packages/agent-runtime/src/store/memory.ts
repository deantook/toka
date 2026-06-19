export class MemoryConversationStore {
  private sessions = new Map<
    string,
    Array<{ role: "user" | "assistant"; content: string }>
  >();

  getMessages(
    sessionId: string,
  ): Array<{ role: "user" | "assistant"; content: string }> {
    return this.sessions.get(sessionId) ?? [];
  }

  appendMessage(
    sessionId: string,
    msg: { role: "user" | "assistant"; content: string },
  ): void {
    const history = this.sessions.get(sessionId) ?? [];
    history.push(msg);
    this.sessions.set(sessionId, history);
  }

  clear(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
