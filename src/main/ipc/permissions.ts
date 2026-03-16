import { ipcMain } from "electron";
import {
  addAlwaysAllowedTool,
  resolvePermission,
} from "../services/approval.service";

export function registerPermissionHandlers(): void {
  ipcMain.on(
    "permission:respond",
    (_event, requestId: string, decision: "allow" | "deny") => {
      resolvePermission(requestId, decision);
    },
  );

  ipcMain.handle("permission:alwaysAllow", (_event, toolName: string) => {
    addAlwaysAllowedTool(toolName);
  });
}
