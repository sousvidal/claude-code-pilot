import { create } from "zustand";

import type { PermissionRequest } from "../../shared/types";

export interface SessionRunState {
  correlationId: string;
  sessionId: string | null;
  messages: unknown[];
  permissionQueue: PermissionRequest[];
}

interface LiveSessionState {
  // Per-run state keyed by correlationId
  runningSessions: Map<string, SessionRunState>;
  // Global: tool use IDs that were auto-approved (unique UUIDs, no per-session routing needed)
  autoApprovedIds: string[];
  // Session IDs that completed while the user was viewing a different session
  unseenSessionIds: string[];
  // UI preferences
  currentModel: string;
  error: string | null;

  startRun: (correlationId: string) => void;
  endRun: (correlationId: string) => void;
  setRunSessionId: (correlationId: string, sessionId: string) => void;
  addMessageToRun: (correlationId: string, message: unknown) => void;

  setCurrentModel: (model: string) => void;
  setError: (error: string | null) => void;

  enqueuePermission: (sessionId: string, request: PermissionRequest) => void;
  dequeuePermission: (sessionId: string) => void;
  clearPermissionsForSession: (sessionId: string) => void;

  addAutoApprovedId: (toolUseId: string) => void;

  markSessionUnseen: (sessionId: string) => void;
  clearSessionUnseen: (sessionId: string) => void;
}

export const useLiveSessionStore = create<LiveSessionState>((set) => ({
  runningSessions: new Map(),
  autoApprovedIds: [],
  unseenSessionIds: [],
  currentModel: "sonnet",
  error: null,

  startRun: (correlationId) =>
    set((state) => {
      const next = new Map(state.runningSessions);
      next.set(correlationId, {
        correlationId,
        sessionId: null,
        messages: [],
        permissionQueue: [],
      });
      return { runningSessions: next };
    }),

  endRun: (correlationId) =>
    set((state) => {
      if (!state.runningSessions.has(correlationId)) return state;
      const next = new Map(state.runningSessions);
      next.delete(correlationId);
      return { runningSessions: next };
    }),

  setRunSessionId: (correlationId, sessionId) =>
    set((state) => {
      const run = state.runningSessions.get(correlationId);
      if (!run) return state;
      const next = new Map(state.runningSessions);
      next.set(correlationId, { ...run, sessionId });
      return { runningSessions: next };
    }),

  addMessageToRun: (correlationId, message) =>
    set((state) => {
      const run = state.runningSessions.get(correlationId);
      if (!run) return state;
      const next = new Map(state.runningSessions);
      next.set(correlationId, { ...run, messages: [...run.messages, message] });
      return { runningSessions: next };
    }),

  setCurrentModel: (model) => set({ currentModel: model }),
  setError: (error) => set({ error }),

  enqueuePermission: (sessionId, request) =>
    set((state) => {
      const next = new Map(state.runningSessions);
      for (const [key, run] of next) {
        if (run.sessionId === sessionId) {
          next.set(key, { ...run, permissionQueue: [...run.permissionQueue, request] });
          break;
        }
      }
      return { runningSessions: next };
    }),

  dequeuePermission: (sessionId) =>
    set((state) => {
      const next = new Map(state.runningSessions);
      for (const [key, run] of next) {
        if (run.sessionId === sessionId) {
          next.set(key, { ...run, permissionQueue: run.permissionQueue.slice(1) });
          break;
        }
      }
      return { runningSessions: next };
    }),

  clearPermissionsForSession: (sessionId) =>
    set((state) => {
      const next = new Map(state.runningSessions);
      for (const [key, run] of next) {
        if (run.sessionId === sessionId) {
          next.set(key, { ...run, permissionQueue: [] });
          break;
        }
      }
      return { runningSessions: next };
    }),

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
