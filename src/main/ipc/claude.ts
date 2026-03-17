import { dialog, ipcMain } from "electron";
import { claudeService } from "../services/claude.service";
import { getUsageData } from "../services/usage.service";

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

  ipcMain.handle("claude:cancel", (_event, options?: Record<string, unknown>) =>
    claudeService.cancelSession(options),
  );

  ipcMain.handle("claude:setModel", (_event, model: string) =>
    claudeService.setModel(model),
  );

  ipcMain.handle("claude:models", () => claudeService.getModels());

  ipcMain.handle("claude:authStatus", () => claudeService.getAuthStatus());

  ipcMain.handle("claude:usageStats", () => claudeService.getUsageStats());

  ipcMain.handle("claude:usageData", () => getUsageData());
}
