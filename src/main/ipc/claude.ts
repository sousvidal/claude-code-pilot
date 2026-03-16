import { dialog, ipcMain } from "electron";
import { claudeService } from "../services/claude.service";

export function registerClaudeHandlers(): void {
  ipcMain.handle("dialog:openDirectory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
  ipcMain.handle(
    "claude:start",
    (_event, prompt: string, options: Record<string, unknown>) =>
      claudeService.startSession(prompt, options),
  );

  ipcMain.handle("claude:send", (_event, message: string) =>
    claudeService.sendMessage(message),
  );

  ipcMain.handle("claude:cancel", () => claudeService.cancelSession());

  ipcMain.handle("claude:setModel", (_event, model: string) =>
    claudeService.setModel(model),
  );

  ipcMain.handle("claude:models", () => claudeService.getModels());
}
