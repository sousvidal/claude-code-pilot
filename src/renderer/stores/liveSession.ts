import { create } from "zustand";

interface LiveSessionState {
  isRunning: boolean;
  hasActiveSession: boolean;
  messages: unknown[];
  currentModel: string;
  error: string | null;

  setRunning: (running: boolean) => void;
  setHasActiveSession: (has: boolean) => void;
  addMessage: (message: unknown) => void;
  clearMessages: () => void;
  setCurrentModel: (model: string) => void;
  setError: (error: string | null) => void;
}

export const useLiveSessionStore = create<LiveSessionState>((set) => ({
  isRunning: false,
  hasActiveSession: false,
  messages: [],
  currentModel: "sonnet",
  error: null,

  setRunning: (running) => set({ isRunning: running }),
  setHasActiveSession: (has) => set({ hasActiveSession: has }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () =>
    set({ messages: [], hasActiveSession: false }),
  setCurrentModel: (model) => set({ currentModel: model }),
  setError: (error) => set({ error }),
}));
