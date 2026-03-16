import { create } from "zustand";

interface SessionsState {
  activeSessionId: string | null;
  activeProjectPath: string | null;
  scrollPositions: Record<string, number>;

  setActiveSession: (sessionId: string, projectPath: string) => void;
  setActiveProjectPath: (path: string | null) => void;
  clearActiveSession: () => void;
  setScrollPosition: (sessionId: string, position: number) => void;
}

export const useSessionsStore = create<SessionsState>((set) => ({
  activeSessionId: null,
  activeProjectPath: null,
  scrollPositions: {},

  setActiveSession: (sessionId, projectPath) => {
    console.info("[sessions] setActiveSession", { sessionId, projectPath });
    set({ activeSessionId: sessionId, activeProjectPath: projectPath });
  },

  setActiveProjectPath: (path) => {
    console.info("[sessions] setActiveProjectPath (new chat)", { projectPath: path });
    set({ activeProjectPath: path, activeSessionId: null });
  },

  clearActiveSession: () => {
    console.info("[sessions] clearActiveSession");
    set({ activeSessionId: null, activeProjectPath: null });
  },

  setScrollPosition: (sessionId, position) =>
    set((state) => ({
      scrollPositions: { ...state.scrollPositions, [sessionId]: position },
    })),
}));
