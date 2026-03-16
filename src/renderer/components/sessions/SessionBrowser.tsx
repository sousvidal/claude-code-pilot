import { useMemo, useState } from "react";
import { Search, Plus, FolderOpen, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useSessionsStore } from "~/stores/sessions";
import { useSessionsService } from "~/services/sessions.service";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import { ProjectGroup } from "./ProjectGroup";
import { SessionItem } from "./SessionItem";

const RECENT_COUNT = 3;

interface SessionInfo {
  sessionId: string;
  summary: string;
  lastModified: number;
  gitBranch?: string;
  cwd?: string;
  firstPrompt?: string;
}

interface ProjectGroupData {
  path: string;
  displayName: string;
  sessions: SessionInfo[];
}

function groupByProject(sessions: SessionInfo[]): ProjectGroupData[] {
  const groups = new Map<string, SessionInfo[]>();
  for (const session of sessions) {
    const cwd = session.cwd ?? "unknown";
    const existing = groups.get(cwd) ?? [];
    existing.push(session);
    groups.set(cwd, existing);
  }
  return Array.from(groups.entries())
    .map(([path, sessions]) => ({
      path,
      displayName: path.split("/").pop() ?? path,
      sessions: sessions.sort((a, b) => b.lastModified - a.lastModified),
    }))
    .sort((a, b) => {
      const aLatest = a.sessions[0]?.lastModified ?? 0;
      const bLatest = b.sessions[0]?.lastModified ?? 0;
      return bLatest - aLatest;
    });
}

export function SessionBrowser() {
  const [searchQuery, setSearchQuery] = useState("");
  const { listSessions } = useSessionsService();
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const pendingNewSession = useSessionsStore((s) => s.pendingNewSession);
  const setActiveProjectPath = useSessionsStore((s) => s.setActiveProjectPath);

  const handleNewChatInFolder = (folderPath: string) => {
    setActiveProjectPath(folderPath);
  };

  const handleNewChat = async () => {
    const path = await window.api.dialog.openDirectory();
    if (path) {
      setActiveProjectPath(path);
    }
  };

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => listSessions(),
  });

  const projects = useMemo(() => groupByProject(sessions ?? []), [sessions]);

  const recentSessions = useMemo(() => {
    if (searchQuery) return [];
    return [...(sessions ?? [])]
      .sort((a, b) => b.lastModified - a.lastModified)
      .slice(0, RECENT_COUNT);
  }, [sessions, searchQuery]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects;
    const query = searchQuery.toLowerCase();
    return projects
      .map((project) => ({
        ...project,
        sessions: project.sessions.filter(
          (s) =>
            s.summary?.toLowerCase().includes(query) ||
            s.firstPrompt?.toLowerCase().includes(query),
        ),
      }))
      .filter((p) => p.sessions.length > 0);
  }, [projects, searchQuery]);

  return (
    <div className="flex h-full flex-col bg-card border-r border-border">
      <div className="flex flex-col gap-2 p-3">
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
          onClick={handleNewChat}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-3">
          {isLoading ? (
            <div className="flex flex-col gap-3 px-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 && recentSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  No sessions found
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Claude Code sessions will appear here once you start using the
                  CLI
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {pendingNewSession && !activeSessionId && (
                <div className="flex w-full items-center gap-2 rounded-md border-l-2 border-accent-blue bg-muted px-3 py-2">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent-blue" />
                  <p className="line-clamp-1 flex-1 text-sm text-foreground">
                    {pendingNewSession.firstPrompt}
                  </p>
                </div>
              )}
              {recentSessions.length > 0 && (
                <>
                  <p className="px-2 pb-1 pt-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Recent
                  </p>
                  {recentSessions.map((session) => (
                    <SessionItem
                      key={session.sessionId}
                      session={session}
                      projectPath={session.cwd ?? ""}
                      isActive={session.sessionId === activeSessionId}
                      projectLabel={session.cwd?.split("/").pop()}
                    />
                  ))}
                  <p className="px-2 pb-1 pt-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Projects
                  </p>
                </>
              )}
              {(searchQuery ? filteredProjects : projects).map((project) => (
                <ProjectGroup
                  key={project.path}
                  path={project.path}
                  displayName={project.displayName}
                  sessions={project.sessions}
                  activeSessionId={activeSessionId}
                  isActiveGroup={project.sessions.some(
                    (s) => s.sessionId === activeSessionId,
                  )}
                  onNewChat={handleNewChatInFolder}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
