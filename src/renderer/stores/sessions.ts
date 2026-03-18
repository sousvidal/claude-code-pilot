import { create } from "zustand";

interface SessionsState {
  openProjects: string[];
  activeSessionId: string | null;
  activeProjectPath: string | null;
  activeSessionsByProject: Record<string, string | null>;
  scrollPositions: Record<string, number>;
  pendingNewSession: { projectPath: string; firstPrompt: string; sessionId?: string } | null;
  pinnedSessionIds: string[];

  openProject: (path: string) => void;
  closeProject: (path: string) => void;
  setActiveProjectPath: (path: string | null) => void;
  setActiveSession: (sessionId: string, projectPath: string) => void;
  clearActiveSession: () => void;
  setScrollPosition: (sessionId: string, position: number) => void;
  setPendingNewSession: (data: { projectPath: string; firstPrompt: string; sessionId?: string }) => void;
  clearPendingNewSession: () => void;
  pinSession: (sessionId: string) => void;
  unpinSession: (sessionId: string) => void;
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  openProjects: [],
  activeSessionId: null,
  activeProjectPath: null,
  activeSessionsByProject: {},
  scrollPositions: {},
  pendingNewSession: null,
  pinnedSessionIds: [],

  openProject: (path) => {
    const { openProjects, activeSessionsByProject } = get();
    const savedSession = activeSessionsByProject[path] ?? null;
    if (openProjects.includes(path)) {
      set({ activeProjectPath: path, activeSessionId: savedSession });
    } else {
      set({
        openProjects: [...openProjects, path],
        activeProjectPath: path,
        activeSessionId: savedSession,
      });
    }
  },

  closeProject: (path) => {
    const { openProjects, activeProjectPath, activeSessionsByProject } = get();
    const filtered = openProjects.filter((p) => p !== path);

    if (activeProjectPath !== path) {
      set({ openProjects: filtered });
      return;
    }

    const closedIndex = openProjects.indexOf(path);
    const nextProject =
      filtered[Math.min(closedIndex, filtered.length - 1)] ?? null;
    const nextSession = nextProject != null ? (activeSessionsByProject[nextProject] ?? null) : null;

    set({
      openProjects: filtered,
      activeProjectPath: nextProject,
      activeSessionId: nextSession,
    });
  },

  setActiveProjectPath: (path) => {
    const { activeSessionsByProject } = get();
    const savedSession = path != null ? (activeSessionsByProject[path] ?? null) : null;
    set({ activeProjectPath: path, activeSessionId: savedSession });
  },

  setActiveSession: (sessionId, projectPath) => {
    set((state) => ({
      activeSessionId: sessionId,
      activeProjectPath: projectPath,
      activeSessionsByProject: {
        ...state.activeSessionsByProject,
        [projectPath]: sessionId,
      },
    }));
  },

  clearActiveSession: () => {
    set((state) => {
      const updatedMap = { ...state.activeSessionsByProject };
      if (state.activeProjectPath != null) {
        updatedMap[state.activeProjectPath] = null;
      }
      return { activeSessionId: null, activeSessionsByProject: updatedMap };
    });
  },

  setScrollPosition: (sessionId, position) =>
    set((state) => ({
      scrollPositions: { ...state.scrollPositions, [sessionId]: position },
    })),

  setPendingNewSession: (data) => set({ pendingNewSession: data }),
  clearPendingNewSession: () => set({ pendingNewSession: null }),

  pinSession: (sessionId) =>
    set((state) => ({
      pinnedSessionIds: state.pinnedSessionIds.includes(sessionId)
        ? state.pinnedSessionIds
        : [...state.pinnedSessionIds, sessionId],
    })),

  unpinSession: (sessionId) =>
    set((state) => ({
      pinnedSessionIds: state.pinnedSessionIds.filter((id) => id !== sessionId),
    })),
}));
