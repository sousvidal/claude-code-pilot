import { create } from "zustand";

import type { PermissionRequest } from "../../shared/types";

interface LiveSessionState {
  isRunning: boolean;
  messages: unknown[];
  currentModel: string;
  error: string | null;
  liveSessionId: string | null;
  permissionQueue: PermissionRequest[];
  autoApprovedIds: string[];
  unseenSessionIds: string[];

  setRunning: (running: boolean) => void;
  addMessage: (message: unknown) => void;
  resetLiveSession: () => void;
  setCurrentModel: (model: string) => void;
  setError: (error: string | null) => void;
  setLiveSessionId: (id: string | null) => void;
  enqueuePermission: (request: PermissionRequest) => void;
  dequeuePermission: () => void;
  clearPermissionQueue: () => void;
  addAutoApprovedId: (toolUseId: string) => void;
  markSessionUnseen: (sessionId: string) => void;
  clearSessionUnseen: (sessionId: string) => void;
}

export const useLiveSessionStore = create<LiveSessionState>((set) => ({
  isRunning: false,
  messages: [],
  currentModel: "sonnet",
  error: null,
  liveSessionId: null,
  permissionQueue: [],
  autoApprovedIds: [],
  unseenSessionIds: [],

  setRunning: (running) => set({ isRunning: running }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  resetLiveSession: () =>
    set({
      messages: [],
      liveSessionId: null,
      permissionQueue: [],
      autoApprovedIds: [],
    }),
  setCurrentModel: (model) => set({ currentModel: model }),
  setError: (error) => set({ error }),
  setLiveSessionId: (id) => set({ liveSessionId: id }),
  enqueuePermission: (request) =>
    set((state) => ({ permissionQueue: [...state.permissionQueue, request] })),
  dequeuePermission: () =>
    set((state) => ({ permissionQueue: state.permissionQueue.slice(1) })),
  clearPermissionQueue: () => set({ permissionQueue: [] }),
  addAutoApprovedId: (toolUseId) =>
    set((state) => ({
      autoApprovedIds: state.autoApprovedIds.includes(toolUseId)
        ? state.autoApprovedIds
        : [...state.autoApprovedIds, toolUseId],
    })),
  markSessionUnseen: (sessionId) =>
    set((state) => ({
      unseenSessionIds: state.unseenSessionIds.includes(sessionId)
        ? state.unseenSessionIds
        : [...state.unseenSessionIds, sessionId],
    })),
  clearSessionUnseen: (sessionId) =>
    set((state) => ({
      unseenSessionIds: state.unseenSessionIds.filter((id) => id !== sessionId),
    })),
}));
