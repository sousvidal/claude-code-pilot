import { MessageSquare, Settings } from "lucide-react";

import { cn } from "~/lib/utils";
import { useUIStore } from "~/stores/ui";
import { useLiveSessionStore } from "~/stores/liveSession";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

const PANELS = [
  { id: "sessions" as const, icon: MessageSquare, label: "Sessions", shortcut: "⌘B" },
] as const;

export function ActivityBar() {
  const activePanel = useUIStore((s) => s.activePanel);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const setActivePanel = useUIStore((s) => s.setActivePanel);

  const hasPermissionPending = useLiveSessionStore((s) =>
    [...s.runningSessions.values()].some((r) => r.permissionQueue.length > 0),
  );
  const unseenCount = useLiveSessionStore((s) => s.unseenSessionIds.length);

  return (
    <div className="flex h-full w-12 flex-col items-center border-r border-border bg-card/50 py-2">
      <div className="flex flex-1 flex-col items-center gap-1">
        <TooltipProvider delayDuration={300}>
          {PANELS.map(({ id, icon: Icon, label, shortcut }) => {
            const isActive = activePanel === id && !sidebarCollapsed;
            const showBadge =
              id === "sessions" && (hasPermissionPending || unseenCount > 0);

            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActivePanel(id)}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {showBadge && (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-amber" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {label} ({shortcut})
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      <div className="flex flex-col items-center gap-1">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActivePanel("settings")}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                  activePanel === "settings" && !sidebarCollapsed
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Settings className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
