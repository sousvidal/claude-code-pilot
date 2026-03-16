import { GitBranch, Loader2 } from "lucide-react";

import { cn, formatRelativeTime } from "~/lib/utils";
import { useSessionsStore } from "~/stores/sessions";
import { useLiveSessionStore } from "~/stores/liveSession";

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
  const setActiveSession = useSessionsStore((s) => s.setActiveSession);
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

  return (
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
        <p className="line-clamp-2 flex-1 text-sm text-foreground">{displayText}</p>
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
  );
}
