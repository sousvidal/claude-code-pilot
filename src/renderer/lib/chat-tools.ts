import type { LucideIcon } from "lucide-react";
import {
  ExternalLink,
  FilePlus,
  FileText,
  FolderSearch,
  Globe,
  ListChecks,
  ListTodo,
  Pencil,
  Search,
  Terminal,
  Users,
  Wrench,
} from "lucide-react";

export interface ToolConfig {
  bg: string;
  text: string;
  icon: LucideIcon;
}

export const TOOL_CONFIG: Record<string, ToolConfig> = {
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

export function getToolConfig(name: string): ToolConfig {
  return (
    TOOL_CONFIG[name] ?? {
      bg: "bg-muted",
      text: "text-muted-foreground",
      icon: Wrench,
    }
  );
}
