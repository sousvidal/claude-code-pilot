import { create } from "zustand";

import type { PermissionRequest } from "../../shared/types";

interface LiveSessionState {
  isRunning: boolean;
  hasActiveSession: boolean;
  messages: unknown[];
  currentModel: string;
  error: string | null;
  liveSessionId: string | null;
  pendingPermission: PermissionRequest | null;
  autoApprovedIds: Set<string>;

  setRunning: (running: boolean) => void;
  setHasActiveSession: (has: boolean) => void;
  addMessage: (message: unknown) => void;
  clearMessages: () => void;
  setCurrentModel: (model: string) => void;
  setError: (error: string | null) => void;
  setLiveSessionId: (id: string | null) => void;
  setPendingPermission: (request: PermissionRequest | null) => void;
  addAutoApprovedId: (toolUseId: string) => void;
}

export const useLiveSessionStore = create<LiveSessionState>((set) => ({
  isRunning: false,
  hasActiveSession: false,
  messages: [],
  currentModel: "sonnet",
  error: null,
  liveSessionId: null,
  pendingPermission: null,
  autoApprovedIds: new Set(),

  setRunning: (running) => set({ isRunning: running }),
  setHasActiveSession: (has) => set({ hasActiveSession: has }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () =>
    set({
      messages: [],
      hasActiveSession: false,
      liveSessionId: null,
      pendingPermission: null,
      autoApprovedIds: new Set(),
    }),
  setCurrentModel: (model) => set({ currentModel: model }),
  setError: (error) => set({ error }),
  setLiveSessionId: (id) => set({ liveSessionId: id }),
  setPendingPermission: (request) => set({ pendingPermission: request }),
  addAutoApprovedId: (toolUseId) =>
    set((state) => ({
      autoApprovedIds: new Set([...state.autoApprovedIds, toolUseId]),
    })),
}));
