import { ShieldOff } from "lucide-react";

import { cn } from "~/lib/utils";
import { formatCost, formatDuration } from "~/lib/utils";
import { getToolConfig } from "~/lib/chat-tools";

interface SessionStatsBarProps {
  turns: number;
  costUsd?: number;
  durationMs?: number;
  toolsUsed: string[];
  model?: string;
  bypassPermissions?: boolean;
}

export function SessionStatsBar({
  turns,
  costUsd,
  durationMs,
  toolsUsed,
  model,
  bypassPermissions,
}: SessionStatsBarProps) {
  const uniqueTools = [...new Set(toolsUsed)];

  return (
    <div className="flex items-center gap-3 border-b border-border/50 bg-card/50 px-4 py-2 text-xs text-muted-foreground">
      <span>{turns} turns</span>
      {costUsd != null && (
        <>
          <span className="text-border">|</span>
          <span>{formatCost(costUsd)}</span>
        </>
      )}
      {durationMs != null && (
        <>
          <span className="text-border">|</span>
          <span>{formatDuration(durationMs)}</span>
        </>
      )}
      {model && (
        <>
          <span className="text-border">|</span>
          <span>{model}</span>
        </>
      )}
      {uniqueTools.length > 0 && (
        <>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            {uniqueTools.map((tool) => {
              const config = getToolConfig(tool);
              const Icon = config.icon;
              return (
                <span
                  key={tool}
                  className={cn(
                    "inline-flex items-center rounded px-1.5 py-0.5",
                    config.bg,
                    config.text,
                  )}
                  title={tool}
                >
                  <Icon className="h-3 w-3" />
                </span>
              );
            })}
          </div>
        </>
      )}
      {bypassPermissions && (
        <>
          <span className="text-border">|</span>
          <span className="inline-flex items-center gap-1 text-accent-amber">
            <ShieldOff className="h-3.5 w-3.5" />
            Bypass
          </span>
        </>
      )}
    </div>
  );
}
