import { create } from "zustand";

interface SessionsState {
  openProjects: string[];
  activeSessionId: string | null;
  activeProjectPath: string | null;
  scrollPositions: Record<string, number>;
  pendingNewSession: { projectPath: string; firstPrompt: string; sessionId?: string } | null;

  openProject: (path: string) => void;
  closeProject: (path: string) => void;
  setActiveProjectPath: (path: string | null) => void;
  setActiveSession: (sessionId: string, projectPath: string) => void;
  clearActiveSession: () => void;
  setScrollPosition: (sessionId: string, position: number) => void;
  setPendingNewSession: (data: { projectPath: string; firstPrompt: string; sessionId?: string }) => void;
  clearPendingNewSession: () => void;
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  openProjects: [],
  activeSessionId: null,
  activeProjectPath: null,
  scrollPositions: {},
  pendingNewSession: null,

  openProject: (path) => {
    const { openProjects } = get();
    if (openProjects.includes(path)) {
      set({ activeProjectPath: path, activeSessionId: null });
    } else {
      set({
        openProjects: [...openProjects, path],
        activeProjectPath: path,
        activeSessionId: null,
      });
    }
  },

  closeProject: (path) => {
    const { openProjects, activeProjectPath } = get();
    const filtered = openProjects.filter((p) => p !== path);

    if (activeProjectPath !== path) {
      set({ openProjects: filtered });
      return;
    }

    const closedIndex = openProjects.indexOf(path);
    const nextProject =
      filtered[Math.min(closedIndex, filtered.length - 1)] ?? null;

    set({
      openProjects: filtered,
      activeProjectPath: nextProject,
      activeSessionId: null,
    });
  },

  setActiveProjectPath: (path) => {
    set({ activeProjectPath: path, activeSessionId: null });
  },

  setActiveSession: (sessionId, projectPath) => {
    set({ activeSessionId: sessionId, activeProjectPath: projectPath });
  },

  clearActiveSession: () => {
    set({ activeSessionId: null });
  },

  setScrollPosition: (sessionId, position) =>
    set((state) => ({
      scrollPositions: { ...state.scrollPositions, [sessionId]: position },
    })),

  setPendingNewSession: (data) => set({ pendingNewSession: data }),
  clearPendingNewSession: () => set({ pendingNewSession: null }),
}));
