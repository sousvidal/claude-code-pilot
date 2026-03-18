import { ipcMain } from "electron";
import { gitService } from "../services/git.service";

export function registerGitHandlers(): void {
  ipcMain.handle("git:getFileAtHead", (_event, filePath: string) =>
    gitService.getFileAtHead(filePath),
  );
}
