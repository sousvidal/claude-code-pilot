import { ipcMain } from "electron";
import { sessionService } from "../services/session.service";

export function registerSessionHandlers(): void {
  ipcMain.handle("sessions:list", (_event, dir?: string) =>
    sessionService.listSessions(dir),
  );

  ipcMain.handle(
    "sessions:getMessages",
    (_event, sessionId: string, dir?: string) =>
      sessionService.getMessages(sessionId, dir),
  );

  ipcMain.handle(
    "sessions:getSubagentMessages",
    (_event, sessionId: string, toolUseId: string, dir?: string) =>
      sessionService.getSubagentMessages(sessionId, toolUseId, dir),
  );

  ipcMain.handle(
    "sessions:delete",
    (_event, sessionId: string, dir?: string) =>
      sessionService.deleteSession(sessionId, dir),
  );
}
