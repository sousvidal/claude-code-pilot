import { useState } from "react";
import { GitBranch, Loader2, Pin, PinOff, Trash2, Check, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cn, formatRelativeTime } from "~/lib/utils";
import { useSessionsStore } from "~/stores/sessions";
import { useLiveSessionStore } from "~/stores/liveSession";
import { useSessionsService } from "~/services/sessions.service";

interface SessionInfo {
  sessionId: string;
  summary: string;
  lastModified: number;
  gitBranch?: string;
  cwd?: string;
  firstPrompt?: string;
}

interface SessionItemProps {
  session: SessionInfo;
  projectPath: string;
  isActive: boolean;
  projectLabel?: string;
}

export function SessionItem({
  session,
  projectPath,
  isActive,
  projectLabel,
}: SessionItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const queryClient = useQueryClient();
  const { deleteSession } = useSessionsService();

  const setActiveSession = useSessionsStore((s) => s.setActiveSession);
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const clearActiveSession = useSessionsStore((s) => s.clearActiveSession);
  const pinnedSessionIds = useSessionsStore((s) => s.pinnedSessionIds);
  const pinSession = useSessionsStore((s) => s.pinSession);
  const unpinSession = useSessionsStore((s) => s.unpinSession);

  const isPinned = pinnedSessionIds.includes(session.sessionId);
  const unseenSessionIds = useLiveSessionStore((s) => s.unseenSessionIds);
  const clearSessionUnseen = useLiveSessionStore((s) => s.clearSessionUnseen);

  const isSessionRunning = useLiveSessionStore((s) =>
    [...s.runningSessions.values()].some((r) => r.sessionId === session.sessionId),
  );

  const hasPendingApproval = useLiveSessionStore((s) => {
    const run = [...s.runningSessions.values()].find((r) => r.sessionId === session.sessionId);
    return (run?.permissionQueue.length ?? 0) > 0 && !isActive;
  });

  const hasUnseenUpdate = unseenSessionIds.includes(session.sessionId) && !isActive;

  const displayText = session.summary || session.firstPrompt || "Untitled session";

  const { mutate: handleDelete } = useMutation({
    mutationFn: () => deleteSession(session.sessionId, session.cwd),
    onSuccess: () => {
      if (activeSessionId === session.sessionId) clearActiveSession();
      unpinSession(session.sessionId);
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session deleted");
    },
    onError: () => {
      toast.error("Failed to delete session");
    },
  });

  return (
    <div className="group relative">
      <button
        onClick={() => {
          clearSessionUnseen(session.sessionId);
          setActiveSession(session.sessionId, projectPath);
        }}
        className={cn(
          "flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left transition-colors duration-100",
          isActive
            ? "bg-muted border-l-2 border-accent-blue"
            : "hover:bg-muted/50",
        )}
      >
        <div className="flex items-center gap-2">
          <p className="line-clamp-2 flex-1 text-sm text-foreground pr-6">{displayText}</p>
          {hasPendingApproval ? (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-amber opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-amber" />
            </span>
          ) : isSessionRunning ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent-blue" />
          ) : hasUnseenUpdate ? (
            <span className="h-2 w-2 shrink-0 rounded-full bg-accent-green" />
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(session.lastModified)}
          </span>
          {projectLabel && (
            <span className="text-xs text-muted-foreground/60 truncate">
              {projectLabel}
            </span>
          )}
          {session.gitBranch && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <GitBranch className="h-3 w-3" />
              {session.gitBranch}
            </span>
          )}
        </div>
      </button>

      <div
        className={cn(
          "absolute right-1 top-1 flex items-center gap-0.5",
          confirmDelete ? "flex" : "hidden group-hover:flex",
        )}
      >
        {confirmDelete ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
                setConfirmDelete(false);
              }}
              className="rounded p-1 text-destructive hover:bg-destructive/10 transition-colors"
              title="Confirm delete"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(false);
              }}
              className="rounded p-1 text-muted-foreground hover:bg-muted transition-colors"
              title="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isPinned) unpinSession(session.sessionId);
                else pinSession(session.sessionId);
              }}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={isPinned ? "Unpin session" : "Pin session"}
            >
              {isPinned ? (
                <PinOff className="h-3.5 w-3.5" />
              ) : (
                <Pin className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete session"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
