import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useLiveSessionStore } from "~/stores/liveSession";
import { useSessionsStore } from "~/stores/sessions";
import { useSessionsService } from "~/services/sessions.service";
import { ErrorBoundary } from "~/components/ui/error-boundary";
import { Skeleton } from "~/components/ui/skeleton";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { MessageStream } from "./MessageStream";
import { PermissionRequestBlock } from "./PermissionRequestBlock";

function MessageLoadingSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-16 w-3/4 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function ChatView() {
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const activeProjectPath = useSessionsStore((s) => s.activeProjectPath);
  const clearPendingNewSession = useSessionsStore((s) => s.clearPendingNewSession);

  const setRunSessionId = useLiveSessionStore((s) => s.setRunSessionId);
  const endRun = useLiveSessionStore((s) => s.endRun);
  const addMessageToRun = useLiveSessionStore((s) => s.addMessageToRun);
  const enqueuePermission = useLiveSessionStore((s) => s.enqueuePermission);
  const dequeuePermission = useLiveSessionStore((s) => s.dequeuePermission);
  const clearPermissionsForSession = useLiveSessionStore((s) => s.clearPermissionsForSession);
  const addAutoApprovedId = useLiveSessionStore((s) => s.addAutoApprovedId);
  const markSessionUnseen = useLiveSessionStore((s) => s.markSessionUnseen);

  // Derive state for the currently active session's run
  const activeRun = useLiveSessionStore((s) => {
    if (activeSessionId) {
      return [...s.runningSessions.values()].find((r) => r.sessionId === activeSessionId) ?? null;
    }
    // New chat: find the pending run (no sessionId yet)
    return [...s.runningSessions.values()].find((r) => r.sessionId === null) ?? null;
  });

  const isRunning = activeRun !== null;
  const liveMessages = activeRun?.messages ?? [];
  const pendingPermission = activeRun?.permissionQueue[0] ?? null;

  const { getMessages } = useSessionsService();
  const queryClient = useQueryClient();

  const {
    data: historyMessages,
    isLoading: isLoadingHistory,
    isFetching: isFetchingHistory,
  } = useQuery({
    queryKey: ["sessionMessages", activeSessionId],
    queryFn: () => getMessages(activeSessionId!, activeProjectPath ?? undefined),
    enabled: Boolean(activeSessionId),
  });

  useEffect(() => {
    const unsubMessage = window.api.claude.onMessage((msg) => {
      const message = msg as Record<string, unknown>;
      const correlationId = message.correlationId as string;
      if (!correlationId) return;

      if (
        message.type === "system" &&
        message.subtype === "init" &&
        typeof message.session_id === "string"
      ) {
        const sessionId = message.session_id;
        setRunSessionId(correlationId, sessionId);
        const currentPending = useSessionsStore.getState().pendingNewSession;
        if (currentPending) {
          useSessionsStore.getState().setPendingNewSession({
            ...currentPending,
            sessionId,
          });
        }
        const sessionsState = useSessionsStore.getState();
        if (!sessionsState.activeSessionId) {
          sessionsState.setActiveSession(sessionId, sessionsState.activeProjectPath ?? "");
        }
        void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      }

      addMessageToRun(correlationId, msg);
    });

    const unsubDone = window.api.claude.onDone(({ correlationId, sessionId }) => {
      endRun(correlationId);
      clearPendingNewSession();
      if (sessionId) {
        clearPermissionsForSession(sessionId);
        const { activeSessionId: currentActiveId } = useSessionsStore.getState();
        if (sessionId !== currentActiveId) {
          markSessionUnseen(sessionId);
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["sessionMessages"] });
      void queryClient.invalidateQueries({ queryKey: ["subagentMessages"] });
    });

    return () => {
      unsubMessage();
      unsubDone();
    };
  }, [
    addMessageToRun,
    setRunSessionId,
    endRun,
    clearPendingNewSession,
    clearPermissionsForSession,
    markSessionUnseen,
    queryClient,
  ]);

  useEffect(() => {
    const unsubRequest = window.api.permission.onRequest((request) => {
      enqueuePermission(request.sessionId, request);
    });
    const unsubAutoApproved = window.api.permission.onAutoApproved((event) => {
      addAutoApprovedId(event.toolUseId);
    });
    return () => {
      unsubRequest();
      unsubAutoApproved();
    };
  }, [enqueuePermission, addAutoApprovedId]);

  const handleAllow = (alwaysAllow: boolean) => {
    if (!pendingPermission) return;
    if (alwaysAllow) {
      void window.api.permission.alwaysAllow(pendingPermission.toolName);
    }
    window.api.permission.respond(pendingPermission.id, "allow");
    if (activeRun?.sessionId) {
      dequeuePermission(activeRun.sessionId);
    }
  };

  const handleDeny = () => {
    if (!pendingPermission) return;
    window.api.permission.respond(pendingPermission.id, "deny");
    if (activeRun?.sessionId) {
      dequeuePermission(activeRun.sessionId);
    }
  };

  const hasProjectContext =
    Boolean(activeProjectPath) || Boolean(activeSessionId);

  if (!hasProjectContext) {
    return (
      <div className="flex h-full flex-col">
        <ChatHeader />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-border bg-card/50 px-12 py-8 text-center">
            <div className="text-4xl font-bold text-muted-foreground/30">
              Clay
            </div>
            <p className="text-sm text-muted-foreground">
              Select a session or start a new chat
            </p>
          </div>
        </div>
        <ChatInput />
      </div>
    );
  }

  const history = historyMessages ?? [];
  const hasLiveMessages = liveMessages.length > 0;

  const messages = (() => {
    if (!hasLiveMessages) return history;
    if (isRunning || isFetchingHistory) {
      const historyIds = new Set(
        history
          .filter((m): m is Record<string, unknown> => typeof m === "object" && m !== null)
          .map((m) => m.uuid as string | undefined)
          .filter(Boolean),
      );
      const newLiveMessages = liveMessages.filter((m) => {
        if (typeof m !== "object" || m === null) return true;
        const id = (m as Record<string, unknown>).uuid as string | undefined;
        return !id || !historyIds.has(id);
      });
      return [...history, ...newLiveMessages];
    }
    return history.length > 0 ? history : liveMessages;
  })();

  return (
    <div className="flex h-full flex-col">
      <ChatHeader />
      <div className="flex min-h-0 flex-1 flex-col">
        <ErrorBoundary fallbackMessage="Failed to render messages">
          {isLoadingHistory && !isRunning && !hasLiveMessages ? (
            <MessageLoadingSkeleton />
          ) : (
            <MessageStream messages={messages} isLive={isRunning} />
          )}
        </ErrorBoundary>
      </div>
      {pendingPermission !== null && (
        <PermissionRequestBlock
          request={pendingPermission}
          onAllow={handleAllow}
          onDeny={handleDeny}
        />
      )}
      <ChatInput />
    </div>
  );
}
