import { existsSync } from "fs";
import ElectronStore from "electron-store";

export interface PersistedAppState {
  openProjects: string[];
  activeProjectPath: string | null;
  activeSessionId: string | null;
  activeSessionsByProject: Record<string, string | null>;
  sidebarCollapsed: boolean;
  touchedFilesSidebarCollapsed: boolean;
  pinnedSessionIds: string[];
  scrollPositions: Record<string, number>;
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
    activeSessionsByProject: {},
    sidebarCollapsed: false,
    touchedFilesSidebarCollapsed: false,
    pinnedSessionIds: [],
    scrollPositions: {},
  },
});

export function getAppState(): PersistedAppState {
  const raw = store.store;

  // Filter out project paths that no longer exist on disk.
  const rawProjects = Array.isArray(raw.openProjects) ? raw.openProjects : [];
  const openProjects = rawProjects.filter((p) => typeof p === "string" && existsSync(p));
  const activeProjectPath =
    raw.activeProjectPath && existsSync(raw.activeProjectPath)
      ? raw.activeProjectPath
      : (openProjects[0] ?? null);

  // Per-project active session map (new) — fall back to legacy single field for
  // the active project if the map doesn't have an entry yet.
  const rawMap: Record<string, string | null> =
    raw.activeSessionsByProject && typeof raw.activeSessionsByProject === "object"
      ? (raw.activeSessionsByProject as Record<string, string | null>)
      : {};

  // Backward-compat: seed from the old activeSessionId for the active project.
  const activeSessionsByProject = { ...rawMap };
  if (
    activeProjectPath &&
    !(activeProjectPath in activeSessionsByProject) &&
    raw.activeSessionId
  ) {
    activeSessionsByProject[activeProjectPath] = raw.activeSessionId;
  }

  const activeSessionId =
    activeProjectPath != null
      ? (activeSessionsByProject[activeProjectPath] ?? null)
      : null;

  const scrollPositions: Record<string, number> =
    raw.scrollPositions && typeof raw.scrollPositions === "object"
      ? (raw.scrollPositions as Record<string, number>)
      : {};

  return {
    openProjects,
    activeProjectPath,
    activeSessionId,
    activeSessionsByProject,
    sidebarCollapsed: raw.sidebarCollapsed,
    touchedFilesSidebarCollapsed: raw.touchedFilesSidebarCollapsed ?? false,
    pinnedSessionIds: raw.pinnedSessionIds ?? [],
    scrollPositions,
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
  if ("activeSessionsByProject" in partial) {
    if (partial.activeSessionsByProject && typeof partial.activeSessionsByProject === "object") {
      validated.activeSessionsByProject = partial.activeSessionsByProject;
    }
  }
  if ("sidebarCollapsed" in partial) {
    if (typeof partial.sidebarCollapsed === "boolean") {
      validated.sidebarCollapsed = partial.sidebarCollapsed;
    }
  }
  if ("touchedFilesSidebarCollapsed" in partial) {
    if (typeof partial.touchedFilesSidebarCollapsed === "boolean") {
      validated.touchedFilesSidebarCollapsed = partial.touchedFilesSidebarCollapsed;
    }
  }
  if ("pinnedSessionIds" in partial) {
    if (Array.isArray(partial.pinnedSessionIds) && partial.pinnedSessionIds.every((p) => typeof p === "string")) {
      validated.pinnedSessionIds = partial.pinnedSessionIds;
    }
  }
  if ("scrollPositions" in partial) {
    if (partial.scrollPositions && typeof partial.scrollPositions === "object") {
      validated.scrollPositions = partial.scrollPositions;
    }
  }

  store.set(validated);
}
