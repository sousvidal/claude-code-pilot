export function useClaudeService() {
  return {
    start: (prompt: string, options: Record<string, unknown>) =>
      window.api.claude.start(prompt, options),
    send: (message: string) => window.api.claude.send(message),
    cancel: () => window.api.claude.cancel(),
    setModel: (model: string) => window.api.claude.setModel(model),
    getModels: () => window.api.claude.models(),
    onMessage: (callback: (message: unknown) => void) =>
      window.api.claude.onMessage(callback),
    onError: (callback: (error: unknown) => void) =>
      window.api.claude.onError(callback),
    onDone: (callback: () => void) => window.api.claude.onDone(callback),
  };
}
