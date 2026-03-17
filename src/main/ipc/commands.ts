import { ipcMain } from "electron";
import { commandsService } from "../services/commands.service";

export function registerCommandHandlers(): void {
  ipcMain.handle("commands:list", (_event, projectPath?: string) =>
    commandsService.list(projectPath),
  );
}
