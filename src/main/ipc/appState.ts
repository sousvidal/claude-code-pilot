import { ipcMain } from "electron";
import { getAppState, setAppState } from "../services/appState.service";
import type { PersistedAppState } from "../services/appState.service";

export function registerAppStateHandlers(): void {
  ipcMain.handle("app:getState", () => getAppState());
  ipcMain.handle("app:setState", (_event, partial: Partial<PersistedAppState>) => {
    setAppState(partial);
  });
}
