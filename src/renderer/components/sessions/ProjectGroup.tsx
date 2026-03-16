import { ChevronRight, Folder, Plus } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
  onNewChat: (path: string) => void;
}

export function ProjectGroup({
  path,
  displayName,
  sessions,
  activeSessionId,
  onNewChat,
}: ProjectGroupProps) {
  return (
    <Collapsible defaultOpen>
      <TooltipProvider delayDuration={500}>
        <div className="group flex w-full items-center rounded-md hover:bg-card-hover transition-colors duration-100">
          <Tooltip>
            <TooltipTrigger asChild>
              <CollapsibleTrigger className="group/trigger flex flex-1 items-center gap-1.5 px-2 py-1.5 text-sm">
                <ChevronRight className="h-3 w-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-90" />
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate text-left font-medium">
                  {displayName}
                </span>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 group-hover:opacity-0 transition-opacity duration-100"
                >
                  {sessions.length}
                </Badge>
              </CollapsibleTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="font-mono text-xs">{path}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="mr-1 h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onNewChat(path);
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs">New chat in this folder</p>
            </TooltipContent>
          </Tooltip>
        </div>
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
