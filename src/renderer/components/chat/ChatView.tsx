import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { useLiveSessionStore } from "~/stores/liveSession";
import { useSessionsStore } from "~/stores/sessions";
import { useSessionsService } from "~/services/sessions.service";
import { Skeleton } from "~/components/ui/skeleton";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { MessageStream } from "./MessageStream";

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
  const { getMessages } = useSessionsService();

  const {
    data: historyMessages,
    isLoading: isLoadingHistory,
  } = useQuery({
    queryKey: ["sessionMessages", activeSessionId],
    queryFn: () => getMessages(activeSessionId!, activeProjectPath ?? undefined),
    enabled: Boolean(activeSessionId),
  });

  useEffect(() => {
    const unsubMessage = window.api.claude.onMessage((msg) => {
      addMessage(msg);
    });
    const unsubDone = window.api.claude.onDone(() => {
      setRunning(false);
    });
    return () => {
      unsubMessage();
      unsubDone();
    };
  }, [addMessage, setRunning]);

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
  // When resuming an existing session, prepend history so the full conversation
  // context is preserved while new messages stream in live.
  const messages = hasLiveMessages
    ? activeSessionId
      ? [...((historyMessages as unknown[]) ?? []), ...liveMessages]
      : liveMessages
    : (historyMessages as unknown[]) ?? [];

  return (
    <div className="flex h-full flex-col">
      <ChatHeader />
      <div className="flex min-h-0 flex-1 flex-col">
        {isLoadingHistory && !isRunning && !hasLiveMessages ? (
          <MessageLoadingSkeleton />
        ) : (
          <MessageStream messages={messages} isLive={hasLiveMessages} />
        )}
      </div>
      <ChatInput />
    </div>
  );
}
