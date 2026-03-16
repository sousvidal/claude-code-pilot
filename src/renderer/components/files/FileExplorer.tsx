import { RotateCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { cn } from "~/lib/utils";
import { useSessionsStore } from "~/stores/sessions";
import { useFilesService } from "~/services/files.service";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { FileTree } from "./FileTree";

const INDENT_CLASSES = [
  "pl-0",
  "pl-4",
  "pl-8",
  "pl-12",
  "pl-16",
  "pl-20",
] as const;

function SkeletonLine({ depth }: { depth: number }) {
  const indentClass = INDENT_CLASSES[Math.min(depth, INDENT_CLASSES.length - 1)];
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 py-1",
        indentClass,
      )}
    >
      <Skeleton className="h-4 w-4 shrink-0 rounded" />
      <Skeleton className="h-4 flex-1 max-w-[120px]" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <SkeletonLine depth={0} />
      <SkeletonLine depth={0} />
      <SkeletonLine depth={1} />
      <SkeletonLine depth={1} />
      <SkeletonLine depth={2} />
      <SkeletonLine depth={0} />
    </div>
  );
}

export function FileExplorer() {
  const queryClient = useQueryClient();
  const activeProjectPath = useSessionsStore((s) => s.activeProjectPath);
  const { readDir } = useFilesService();

  const { data: nodes, isLoading } = useQuery({
    queryKey: ["files", "root", activeProjectPath ?? ""],
    queryFn: () => (activeProjectPath ? readDir(activeProjectPath) : []),
    enabled: Boolean(activeProjectPath),
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["files"] });
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-card border-l border-border",
      )}
    >
      <div className="flex flex-col gap-1 border-b border-border px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            FILES
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleRefresh}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {activeProjectPath && (
          <p
            className="text-xs font-mono text-muted-foreground truncate"
            title={activeProjectPath}
          >
            {activeProjectPath}
          </p>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 py-1">
          {!activeProjectPath ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Select a session to browse project files
            </p>
          ) : isLoading ? (
            <LoadingSkeleton />
          ) : nodes && nodes.length > 0 ? (
            <FileTree nodes={nodes} depth={0} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No files to display
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
