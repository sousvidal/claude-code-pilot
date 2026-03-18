import { useMemo, useRef, useState } from "react";
import { Search, Plus, FolderOpen, Loader2, Pin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";

import { useSessionsStore } from "~/stores/sessions";
import { useSessionsService } from "~/services/sessions.service";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { SessionItem } from "./SessionItem";

interface SessionInfo {
  sessionId: string;
  summary: string;
  lastModified: number;
  gitBranch?: string;
  cwd?: string;
  firstPrompt?: string;
}

type ListItem =
  | { kind: "pending" }
  | { kind: "pinned-header" }
  | { kind: "separator" }
  | { kind: "session"; session: SessionInfo }
  | { kind: "empty" };

export function SessionBrowser() {
  const [searchQuery, setSearchQuery] = useState("");
  const { listSessions } = useSessionsService();
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const activeProjectPath = useSessionsStore((s) => s.activeProjectPath);
  const clearActiveSession = useSessionsStore((s) => s.clearActiveSession);
  const setActiveSession = useSessionsStore((s) => s.setActiveSession);
  const openProject = useSessionsStore((s) => s.openProject);
  const pendingNewSession = useSessionsStore((s) => s.pendingNewSession);
  const pinnedSessionIds = useSessionsStore((s) => s.pinnedSessionIds);

  const parentRef = useRef<HTMLDivElement>(null);

  const handleNewChat = () => {
    clearActiveSession();
  };

  const handleNewChatInFolder = async () => {
    const path = await window.api.dialog.openDirectory();
    if (path) openProject(path);
  };

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => listSessions(),
  });

  const projectSessions = useMemo(() => {
    if (!activeProjectPath || !sessions) return [];
    return (sessions as SessionInfo[])
      .filter((s) => s.cwd === activeProjectPath)
      .sort((a, b) => b.lastModified - a.lastModified);
  }, [sessions, activeProjectPath]);

  const filteredSessions = useMemo(() => {
    if (!searchQuery) return projectSessions;
    const query = searchQuery.toLowerCase();
    return projectSessions.filter(
      (s) =>
        s.summary?.toLowerCase().includes(query) ||
        s.firstPrompt?.toLowerCase().includes(query),
    );
  }, [projectSessions, searchQuery]);

  const pinnedSessions = useMemo(
    () => filteredSessions.filter((s) => pinnedSessionIds.includes(s.sessionId)),
    [filteredSessions, pinnedSessionIds],
  );

  const unpinnedSessions = useMemo(
    () => filteredSessions.filter((s) => !pinnedSessionIds.includes(s.sessionId)),
    [filteredSessions, pinnedSessionIds],
  );

  const showPending =
    !!pendingNewSession &&
    pendingNewSession.projectPath === activeProjectPath &&
    (!pendingNewSession.sessionId ||
      !projectSessions.some((s) => s.sessionId === pendingNewSession.sessionId));

  // Build flat item list for the virtualizer.
  const flatItems = useMemo<ListItem[]>(() => {
    if (!activeProjectPath) return [];
    const items: ListItem[] = [];

    if (showPending) items.push({ kind: "pending" });

    if (filteredSessions.length === 0) {
      items.push({ kind: "empty" });
      return items;
    }

    if (pinnedSessions.length > 0) {
      items.push({ kind: "pinned-header" });
      for (const s of pinnedSessions) items.push({ kind: "session", session: s });
      if (unpinnedSessions.length > 0) items.push({ kind: "separator" });
    }

    for (const s of unpinnedSessions) items.push({ kind: "session", session: s });

    return items;
  }, [activeProjectPath, showPending, filteredSessions, pinnedSessions, unpinnedSessions]);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => {
      const item = flatItems[i];
      if (!item) return 60;
      switch (item.kind) {
        case "pending": return 40;
        case "pinned-header": return 28;
        case "separator": return 9;
        case "empty": return 60;
        case "session": return 64;
      }
    },
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
        ? (el) => el.getBoundingClientRect().height
        : undefined,
    overscan: 8,
  });

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            data-search-sessions
            placeholder="Search sessions..."
            className="bg-muted pl-9 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sm"
          onClick={activeProjectPath ? handleNewChat : handleNewChatInFolder}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {!activeProjectPath ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">No project selected</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Use the project switcher above to select a project
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col gap-3 px-3 pt-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div ref={parentRef} className="h-full overflow-y-auto">
            <div
              style={{ height: `${virtualizer.getTotalSize()}px` }}
              className="relative px-2 pt-1 pb-3"
            >
              {virtualizer.getVirtualItems().map((vItem) => {
                const item = flatItems[vItem.index];
                if (!item) return null;

                return (
                  <div
                    key={vItem.key}
                    data-index={vItem.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${vItem.start}px)`,
                    }}
                    className="px-2"
                  >
                    {item.kind === "pending" && pendingNewSession && (
                      <button
                        disabled={!pendingNewSession.sessionId}
                        onClick={() => {
                          if (pendingNewSession.sessionId) {
                            setActiveSession(pendingNewSession.sessionId, pendingNewSession.projectPath);
                          }
                        }}
                        className="mb-1 flex w-full items-center gap-2 rounded-md border-l-2 border-accent-blue bg-muted px-3 py-2 text-left disabled:cursor-default"
                      >
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent-blue" />
                        <p className="line-clamp-1 flex-1 text-sm text-foreground">
                          {pendingNewSession.firstPrompt}
                        </p>
                      </button>
                    )}

                    {item.kind === "pinned-header" && (
                      <div className="flex items-center gap-1.5 px-1 pt-1 pb-0.5">
                        <Pin className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wide">
                          Pinned
                        </span>
                      </div>
                    )}

                    {item.kind === "separator" && (
                      <div className="mx-1 my-1 border-t border-border" />
                    )}

                    {item.kind === "empty" && (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        {searchQuery ? "No matching sessions" : "No sessions yet"}
                      </p>
                    )}

                    {item.kind === "session" && (
                      <div className="mb-1">
                        <SessionItem
                          session={item.session}
                          projectPath={activeProjectPath}
                          isActive={item.session.sessionId === activeSessionId}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
