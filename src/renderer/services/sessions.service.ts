export function useSessionsService() {
  return {
    listSessions: (dir?: string) => window.api.sessions.list(dir),
    getMessages: (sessionId: string, dir?: string) =>
      window.api.sessions.getMessages(sessionId, dir),
    getSubagentMessages: (sessionId: string, toolUseId: string, dir?: string) =>
      window.api.sessions.getSubagentMessages(sessionId, toolUseId, dir),
  };
}
