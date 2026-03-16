import { useState } from "react";
import { Search, Plus, FolderOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useLiveSessionStore } from "~/stores/liveSession";
import { useSessionsStore } from "~/stores/sessions";
import { useSessionsService } from "~/services/sessions.service";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import { ProjectGroup } from "./ProjectGroup";

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
  const setActiveProjectPath = useSessionsStore((s) => s.setActiveProjectPath);
  const clearMessages = useLiveSessionStore((s) => s.clearMessages);

  const handleNewChat = async () => {
    const path = await window.api.dialog.openDirectory();
    if (path) {
      setActiveProjectPath(path);
      clearMessages();
    }
  };

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => listSessions(),
  });

  const projects = groupByProject((sessions as SessionInfo[]) ?? []);

  const filteredProjects = searchQuery
    ? projects
        .map((project) => ({
          ...project,
          sessions: project.sessions.filter(
            (s) =>
              s.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              s.firstPrompt?.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
        }))
        .filter((p) => p.sessions.length > 0)
    : projects;

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
          ) : filteredProjects.length === 0 ? (
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
              {filteredProjects.map((project) => (
                <ProjectGroup
                  key={project.path}
                  path={project.path}
                  displayName={project.displayName}
                  sessions={project.sessions}
                  activeSessionId={activeSessionId}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
