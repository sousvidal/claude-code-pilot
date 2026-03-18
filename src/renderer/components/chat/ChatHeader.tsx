import { ChevronRight, GitBranch, PanelRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useSessionsStore } from "~/stores/sessions";
import { useUIStore } from "~/stores/ui";
import { useSessionsService } from "~/services/sessions.service";
import { useLiveSessionStore } from "~/stores/liveSession";
import { useTouchedFiles } from "~/lib/use-touched-files";

interface SessionInfo {
  sessionId: string;
  summary: string;
  lastModified: number;
  gitBranch?: string;
  cwd?: string;
  firstPrompt?: string;
}

export function ChatHeader() {
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const activeProjectPath = useSessionsStore((s) => s.activeProjectPath);
  const currentModel = useLiveSessionStore((s) => s.currentModel);
  const touchedFilesSidebarCollapsed = useUIStore((s) => s.touchedFilesSidebarCollapsed);
  const toggleTouchedFilesSidebar = useUIStore((s) => s.toggleTouchedFilesSidebar);
  const touchedFiles = useTouchedFiles();
  const { listSessions } = useSessionsService();

  const { data: sessions } = useQuery({
    queryKey: ["sessions", activeProjectPath],
    queryFn: () => listSessions(activeProjectPath ?? undefined),
    enabled: Boolean(activeProjectPath),
  });

  const activeSession = (sessions as SessionInfo[] | undefined)?.find(
    (s) => s.sessionId === activeSessionId,
  );

  const projectName = activeProjectPath?.split("/").pop() ?? "Project";
  const sessionSummary = activeSession?.summary ?? activeSession?.firstPrompt ?? "Session";

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-sm">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium text-foreground">
          {projectName}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm text-muted-foreground">
          {sessionSummary}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {currentModel}
        </Badge>
        {activeSession?.gitBranch && (
          <Badge
            variant="outline"
            className="gap-1 text-xs text-muted-foreground"
          >
            <GitBranch className="h-3 w-3" />
            {activeSession.gitBranch}
          </Badge>
        )}
        {touchedFiles.length > 0 && touchedFilesSidebarCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleTouchedFilesSidebar}
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
