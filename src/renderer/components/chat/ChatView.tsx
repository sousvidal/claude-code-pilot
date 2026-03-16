import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useLiveSessionStore } from "~/stores/liveSession";
import { useSessionsStore } from "~/stores/sessions";
import { useSessionsService } from "~/services/sessions.service";
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
  const liveMessages = useLiveSessionStore((s) => s.messages);
  const addMessage = useLiveSessionStore((s) => s.addMessage);
  const setRunning = useLiveSessionStore((s) => s.setRunning);
  const isRunning = useLiveSessionStore((s) => s.isRunning);
  const liveSessionId = useLiveSessionStore((s) => s.liveSessionId);
  const setLiveSessionId = useLiveSessionStore((s) => s.setLiveSessionId);
  const permissionQueue = useLiveSessionStore((s) => s.permissionQueue);
  const enqueuePermission = useLiveSessionStore((s) => s.enqueuePermission);
  const dequeuePermission = useLiveSessionStore((s) => s.dequeuePermission);
  const clearPermissionQueue = useLiveSessionStore((s) => s.clearPermissionQueue);
  const addAutoApprovedId = useLiveSessionStore((s) => s.addAutoApprovedId);
  const pendingPermission = permissionQueue[0] ?? null;
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
      if (
        typeof msg === "object" &&
        msg !== null &&
        (msg as Record<string, unknown>).type === "system" &&
        (msg as Record<string, unknown>).subtype === "init" &&
        typeof (msg as Record<string, unknown>).session_id === "string"
      ) {
        const sessionId = (msg as Record<string, unknown>).session_id as string;
        setLiveSessionId(sessionId);
        const sessionsState = useSessionsStore.getState();
        if (!sessionsState.activeSessionId) {
          sessionsState.setActiveSession(sessionId, sessionsState.activeProjectPath ?? "");
        }
        void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      }
      addMessage(msg);
    });
    const unsubDone = window.api.claude.onDone(() => {
      setRunning(false);
      clearPermissionQueue();
      const { liveSessionId: doneSessionId } = useLiveSessionStore.getState();
      const { activeSessionId: currentActiveId } = useSessionsStore.getState();
      if (doneSessionId && doneSessionId !== currentActiveId) {
        useLiveSessionStore.getState().markSessionUnseen(doneSessionId);
      }
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["sessionMessages"] });
      void queryClient.invalidateQueries({ queryKey: ["subagentMessages"] });
    });
    return () => {
      unsubMessage();
      unsubDone();
    };
  }, [addMessage, setRunning, setLiveSessionId, clearPermissionQueue, queryClient]);

  useEffect(() => {
    const unsubRequest = window.api.permission.onRequest((request) => {
      enqueuePermission(request);
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
    dequeuePermission();
  };

  const handleDeny = () => {
    if (!pendingPermission) return;
    window.api.permission.respond(pendingPermission.id, "deny");
    dequeuePermission();
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

  const isViewingLiveSession =
    liveSessionId !== null && liveSessionId === activeSessionId;
  const relevantLiveMessages = isViewingLiveSession ? liveMessages : [];
  const hasLiveMessages = relevantLiveMessages.length > 0;
  const history = historyMessages ?? [];

  const messages = (() => {
    if (!hasLiveMessages) return history;
    // While running or refetching history, append live messages after history.
    // Deduplicate by excluding live messages whose uuid already appears in history.
    if (isRunning || isFetchingHistory) {
      const historyIds = new Set(
        history
          .filter((m): m is Record<string, unknown> => typeof m === "object" && m !== null)
          .map((m) => m.uuid as string | undefined)
          .filter(Boolean),
      );
      const newLiveMessages = relevantLiveMessages.filter((m) => {
        if (typeof m !== "object" || m === null) return true;
        const id = (m as Record<string, unknown>).uuid as string | undefined;
        return !id || !historyIds.has(id);
      });
      return [...history, ...newLiveMessages];
    }
    return history.length > 0 ? history : relevantLiveMessages;
  })();

  const isLive = isRunning && isViewingLiveSession;

  const showPermissionBlock =
    pendingPermission !== null &&
    (liveSessionId === null || pendingPermission.sessionId === liveSessionId);

  return (
    <div className="flex h-full flex-col">
      <ChatHeader />
      <div className="flex min-h-0 flex-1 flex-col">
        {isLoadingHistory && !isViewingLiveSession && !hasLiveMessages ? (
          <MessageLoadingSkeleton />
        ) : (
          <MessageStream messages={messages} isLive={isLive} />
        )}
      </div>
      {showPermissionBlock && (
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
