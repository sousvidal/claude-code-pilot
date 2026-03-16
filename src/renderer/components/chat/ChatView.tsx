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
  const pendingPermission = useLiveSessionStore((s) => s.pendingPermission);
  const setPendingPermission = useLiveSessionStore((s) => s.setPendingPermission);
  const addAutoApprovedId = useLiveSessionStore((s) => s.addAutoApprovedId);
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
      const m = msg as Record<string, unknown>;
      if (
        m.type === "system" &&
        m.subtype === "init" &&
        typeof m.session_id === "string"
      ) {
        setLiveSessionId(m.session_id);
      }
      addMessage(msg);
    });
    const unsubDone = window.api.claude.onDone(() => {
      setRunning(false);
      setPendingPermission(null);
      void queryClient.invalidateQueries({ queryKey: ["sessionMessages"] });
    });
    return () => {
      unsubMessage();
      unsubDone();
    };
  }, [addMessage, setRunning, setLiveSessionId, setPendingPermission, queryClient]);

  useEffect(() => {
    const unsubRequest = window.api.permission.onRequest((request) => {
      setPendingPermission(request);
    });
    const unsubAutoApproved = window.api.permission.onAutoApproved((event) => {
      addAutoApprovedId(event.toolUseId);
    });
    return () => {
      unsubRequest();
      unsubAutoApproved();
    };
  }, [setPendingPermission, addAutoApprovedId]);

  const handleAllow = (alwaysAllow: boolean) => {
    if (!pendingPermission) return;
    if (alwaysAllow) {
      void window.api.permission.alwaysAllow(pendingPermission.toolName);
    }
    window.api.permission.respond(pendingPermission.id, "allow");
    setPendingPermission(null);
  };

  const handleDeny = () => {
    if (!pendingPermission) return;
    window.api.permission.respond(pendingPermission.id, "deny");
    setPendingPermission(null);
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
              Claude Code Pilot
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

  const hasLiveMessages = liveMessages.length > 0;
  const history = (historyMessages as unknown[]) ?? [];

  // While the session is running or the post-completion refetch is in progress,
  // merge history + live so new messages appear in real time.
  // Once the refetch settles, history contains everything (with proper tool
  // results from the JSONL) so we use it exclusively to avoid duplication.
  const messages = (() => {
    if (!hasLiveMessages) return history;
    if (isRunning || isFetchingHistory) {
      return activeSessionId ? [...history, ...liveMessages] : liveMessages;
    }
    // Session done and refetch complete: prefer refreshed history, fall back to live
    return history.length > 0 ? history : liveMessages;
  })();

  const showPermissionBlock =
    pendingPermission !== null &&
    (liveSessionId === null || pendingPermission.sessionId === liveSessionId);

  return (
    <div className="flex h-full flex-col">
      <ChatHeader />
      <div className="flex min-h-0 flex-1 flex-col">
        {isLoadingHistory && !isRunning && !hasLiveMessages ? (
          <MessageLoadingSkeleton />
        ) : (
          <MessageStream messages={messages} isLive={isRunning} />
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
