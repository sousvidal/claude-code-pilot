import {
  ChevronRight,
  CircleCheck,
  CircleX,
  ExternalLink,
  FilePlus,
  FileText,
  FolderSearch,
  Globe,
  ListChecks,
  ListTodo,
  Loader2,
  Pencil,
  Search,
  Terminal,
  Users,
  Wrench,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { cn, truncate } from "~/lib/utils";
import { useLiveSessionStore } from "~/stores/liveSession";
import type { ToolResult } from "../../../shared/types";
import { ToolResultContent } from "./ToolResultContent";

interface ToolCallBlockProps {
  toolUseId?: string;
  toolName: string;
  input: Record<string, unknown>;
  result?: ToolResult;
  isError: boolean;
  isRunning?: boolean;
  isLive?: boolean;
}


const TOOL_CONFIG: Record<
  string,
  { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  Read: { bg: "bg-accent-blue/15", text: "text-accent-blue", icon: FileText },
  Bash: { bg: "bg-accent-green/15", text: "text-accent-green", icon: Terminal },
  WebSearch: { bg: "bg-accent-blue/15", text: "text-accent-blue", icon: Globe },
  Edit: { bg: "bg-accent-amber/15", text: "text-accent-amber", icon: Pencil },
  Write: { bg: "bg-accent-amber/15", text: "text-accent-amber", icon: FilePlus },
  Glob: { bg: "bg-accent-purple/15", text: "text-accent-purple", icon: FolderSearch },
  WebFetch: { bg: "bg-accent-blue/15", text: "text-accent-blue", icon: ExternalLink },
  Grep: { bg: "bg-accent-purple/15", text: "text-accent-purple", icon: Search },
  Agent: { bg: "bg-accent-cyan/15", text: "text-accent-cyan", icon: Users },
  Task: { bg: "bg-accent-cyan/15", text: "text-accent-cyan", icon: Users },
  TaskCreate: { bg: "bg-accent-amber/15", text: "text-accent-amber", icon: ListTodo },
  TaskUpdate: { bg: "bg-accent-amber/15", text: "text-accent-amber", icon: ListChecks },
};

function getToolConfig(name: string) {
  return (
    TOOL_CONFIG[name] ?? {
      bg: "bg-muted",
      text: "text-muted-foreground",
      icon: Wrench,
    }
  );
}

function getSummary(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "Read":
      return typeof input.path === "string" ? input.path : "—";
    case "Bash":
      return typeof input.command === "string"
        ? truncate(input.command, 50)
        : "—";
    case "WebSearch":
      return typeof input.search_term === "string"
        ? `"${truncate(input.search_term, 40)}"`
        : "—";
    case "Edit":
      return typeof input.path === "string" ? input.path : "—";
    case "Write":
      return typeof input.path === "string"
        ? `${input.path} (new)`
        : "—";
    case "Glob":
      return typeof input.glob_pattern === "string"
        ? input.glob_pattern
        : "—";
    case "WebFetch":
      return typeof input.url === "string"
        ? truncate(input.url, 50)
        : "—";
    case "Grep":
      return typeof input.pattern === "string" ? input.pattern : "—";
    case "Agent":
    case "Task":
      return typeof input.description === "string"
        ? truncate(input.description, 40)
        : "—";
    default:
      return "—";
  }
}

export function ToolCallBlock({
  toolUseId,
  toolName,
  input,
  result,
  isError,
  isRunning,
  isLive = true,
}: ToolCallBlockProps) {
  const autoApprovedIds = useLiveSessionStore((s) => s.autoApprovedIds);
  const isAutoApproved = Boolean(toolUseId && autoApprovedIds.includes(toolUseId));
  const config = getToolConfig(toolName);
  const Icon = config.icon;
  const summary = getSummary(toolName, input);
  const running = isRunning ?? (isLive && !result);

  const statusIcon = running ? (
    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
  ) : isError ? (
    <CircleX className="h-4 w-4 shrink-0 text-accent-red" />
  ) : (
    <CircleCheck className="h-4 w-4 shrink-0 text-accent-green" />
  );

  return (
    <Collapsible defaultOpen={false} className="group">
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-left transition-colors hover:bg-muted/30">
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
            config.bg,
            config.text,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {toolName}
        </span>
        {isAutoApproved && (
          <span className="inline-flex items-center rounded-md bg-accent-green/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-green">
            auto
          </span>
        )}
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
          {summary}
        </span>
        {statusIcon}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-lg border border-border/30 bg-muted/20 px-4 py-3">
          <ToolResultContent
            toolName={toolName}
            input={input}
            result={result}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
