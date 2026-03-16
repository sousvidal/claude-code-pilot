import { ChevronRight, Folder } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Badge } from "~/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { SessionItem } from "./SessionItem";

interface SessionInfo {
  sessionId: string;
  summary: string;
  lastModified: number;
  gitBranch?: string;
  cwd?: string;
  firstPrompt?: string;
}

interface ProjectGroupProps {
  path: string;
  displayName: string;
  sessions: SessionInfo[];
  activeSessionId: string | null;
}

export function ProjectGroup({
  path,
  displayName,
  sessions,
  activeSessionId,
}: ProjectGroupProps) {
  return (
    <Collapsible defaultOpen>
      <TooltipProvider delayDuration={500}>
        <Tooltip>
          <TooltipTrigger asChild>
            <CollapsibleTrigger className="group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-card-hover transition-colors duration-100">
              <ChevronRight className="h-3 w-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate text-left font-medium">
                {displayName}
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {sessions.length}
              </Badge>
            </CollapsibleTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="font-mono text-xs">{path}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <CollapsibleContent>
        <div className="ml-3 flex flex-col gap-0.5 border-l border-border/50 pl-2 pt-1">
          {sessions.map((session) => (
            <SessionItem
              key={session.sessionId}
              session={session}
              projectPath={path}
              isActive={session.sessionId === activeSessionId}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
