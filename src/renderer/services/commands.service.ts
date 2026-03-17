export function useCommandsService() {
  return {
    listCommands: (projectPath?: string) => window.api.commands.list(projectPath),
  };
}
