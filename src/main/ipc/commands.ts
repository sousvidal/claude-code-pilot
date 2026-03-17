import { ipcMain } from "electron";
import path from "path";
import { commandsService } from "../services/commands.service";
import { getAppState } from "../services/appState.service";

export function registerCommandHandlers(): void {
  ipcMain.handle("commands:list", (_event, projectPath?: string) => {
    if (projectPath !== undefined) {
      if (!path.isAbsolute(projectPath)) return [];
      const { openProjects } = getAppState();
      if (!openProjects.includes(projectPath)) return [];
    }
    return commandsService.list(projectPath);
  });
}
