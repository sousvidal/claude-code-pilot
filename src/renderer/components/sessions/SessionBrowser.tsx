import { useMemo, useState } from "react";
import { Search, Plus, FolderOpen, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Pin } from "lucide-react";

import { useSessionsStore } from "~/stores/sessions";
import { useSessionsService } from "~/services/sessions.service";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
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

export function SessionBrowser() {
  const [searchQuery, setSearchQuery] = useState("");
  const { listSessions } = useSessionsService();
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const activeProjectPath = useSessionsStore((s) => s.activeProjectPath);
  const clearActiveSession = useSessionsStore((s) => s.clearActiveSession);
  const openProject = useSessionsStore((s) => s.openProject);
  const pendingNewSession = useSessionsStore((s) => s.pendingNewSession);
  const pinnedSessionIds = useSessionsStore((s) => s.pinnedSessionIds);

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

      <ScrollArea className="flex-1">
        <div className="px-2 pb-3">
          {!activeProjectPath ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  No project selected
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Use the project switcher above to select a project
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col gap-3 px-1 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1 pt-1">
              {pendingNewSession && (
                !pendingNewSession.sessionId ||
                !projectSessions.some((s) => s.sessionId === pendingNewSession.sessionId)
              ) && (
                <div className="flex w-full items-center gap-2 rounded-md border-l-2 border-accent-blue bg-muted px-3 py-2">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent-blue" />
                  <p className="line-clamp-1 flex-1 text-sm text-foreground">
                    {pendingNewSession.firstPrompt}
                  </p>
                </div>
              )}
              {filteredSessions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {searchQuery ? "No matching sessions" : "No sessions yet"}
                </p>
              ) : (
                <>
                  {pinnedSessions.length > 0 && (
                    <>
                      <div className="flex items-center gap-1.5 px-1 pt-1 pb-0.5">
                        <Pin className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wide">
                          Pinned
                        </span>
                      </div>
                      {pinnedSessions.map((session) => (
                        <SessionItem
                          key={session.sessionId}
                          session={session}
                          projectPath={activeProjectPath}
                          isActive={session.sessionId === activeSessionId}
                        />
                      ))}
                      {unpinnedSessions.length > 0 && (
                        <div className="mx-1 my-1 border-t border-border" />
                      )}
                    </>
                  )}
                  {unpinnedSessions.map((session) => (
                    <SessionItem
                      key={session.sessionId}
                      session={session}
                      projectPath={activeProjectPath}
                      isActive={session.sessionId === activeSessionId}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
