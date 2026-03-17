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

  // Filter out project paths that no longer exist on disk.
  // Guard against corruption: openProjects must be a string array.
  const rawProjects = Array.isArray(raw.openProjects) ? raw.openProjects : [];
  const openProjects = rawProjects.filter((p) => typeof p === "string" && existsSync(p));
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
  const validated: Partial<PersistedAppState> = {};

  if ("openProjects" in partial) {
    if (Array.isArray(partial.openProjects) && partial.openProjects.every((p) => typeof p === "string")) {
      validated.openProjects = partial.openProjects;
    }
  }
  if ("activeProjectPath" in partial) {
    if (partial.activeProjectPath === null || typeof partial.activeProjectPath === "string") {
      validated.activeProjectPath = partial.activeProjectPath;
    }
  }
  if ("activeSessionId" in partial) {
    if (partial.activeSessionId === null || typeof partial.activeSessionId === "string") {
      validated.activeSessionId = partial.activeSessionId;
    }
  }
  if ("sidebarCollapsed" in partial) {
    if (typeof partial.sidebarCollapsed === "boolean") {
      validated.sidebarCollapsed = partial.sidebarCollapsed;
    }
  }
  if ("pinnedSessionIds" in partial) {
    if (Array.isArray(partial.pinnedSessionIds) && partial.pinnedSessionIds.every((p) => typeof p === "string")) {
      validated.pinnedSessionIds = partial.pinnedSessionIds;
    }
  }

  store.set(validated);
}
