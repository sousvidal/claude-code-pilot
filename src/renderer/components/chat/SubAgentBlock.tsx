import { ChevronRight, CircleCheck, Loader2, Users } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { cn } from "~/lib/utils";
import { getToolConfig } from "~/lib/chat-tools";

interface SubAgentBlockProps {
  agentType: string;
  summary?: string;
  agentId?: string;
  messageCount?: number;
  isRunning?: boolean;
  children?: React.ReactNode;
}

export function SubAgentBlock({
  agentType,
  summary,
  agentId,
  messageCount,
  isRunning,
  children,
}: SubAgentBlockProps) {
  const config = getToolConfig(agentType);

  return (
    <Collapsible defaultOpen={false} className="group">
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-left transition-colors hover:bg-muted/30">
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
        <Users className="h-4 w-4 shrink-0 text-accent-cyan" />
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
            config.bg,
            config.text,
          )}
        >
          {agentType}
        </span>
        {summary && (
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
            {summary}
          </span>
        )}
        {messageCount != null && (
          <span className="text-xs text-muted-foreground">
            {messageCount} turns
          </span>
        )}
        {isRunning ? (
          <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <CircleCheck className="ml-auto h-4 w-4 shrink-0 text-accent-green" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {children && (
          <div
            className="mt-2 ml-4 border-l-2 border-accent-cyan/30 pl-4"
            {...(agentId ? { "data-agent-id": agentId } : {})}
          >
            {children}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
