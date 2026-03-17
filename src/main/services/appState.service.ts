import { existsSync } from "fs";
import ElectronStore from "electron-store";

export interface PersistedAppState {
  openProjects: string[];
  activeProjectPath: string | null;
  activeSessionId: string | null;
  sidebarCollapsed: boolean;
  pinnedSessionIds: string[];
}

// electron-store ships as ESM; when bundled to CJS the constructor is on .default
const StoreClass = (
  ElectronStore as unknown as { default: typeof ElectronStore }
).default ?? ElectronStore;

const store = new StoreClass<PersistedAppState>({
  name: "appState",
  defaults: {
    openProjects: [],
    activeProjectPath: null,
    activeSessionId: null,
    sidebarCollapsed: false,
    pinnedSessionIds: [],
  },
});

export function getAppState(): PersistedAppState {
  const raw = store.store;

  // Filter out project paths that no longer exist on disk
  const openProjects = raw.openProjects.filter((p) => existsSync(p));
  const activeProjectPath =
    raw.activeProjectPath && existsSync(raw.activeProjectPath)
      ? raw.activeProjectPath
      : (openProjects[0] ?? null);

  return {
    openProjects,
    activeProjectPath,
    activeSessionId:
      activeProjectPath === raw.activeProjectPath ? raw.activeSessionId : null,
    sidebarCollapsed: raw.sidebarCollapsed,
    pinnedSessionIds: raw.pinnedSessionIds ?? [],
  };
}

export function setAppState(partial: Partial<PersistedAppState>): void {
  store.set(partial);
}
