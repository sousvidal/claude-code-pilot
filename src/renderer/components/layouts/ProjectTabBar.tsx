import { FolderOpen, Plus, X } from "lucide-react";

import { cn } from "~/lib/utils";
import { useSessionsStore } from "~/stores/sessions";

export function ProjectTabBar() {
  const openProjects = useSessionsStore((s) => s.openProjects);
  const activeProjectPath = useSessionsStore((s) => s.activeProjectPath);
  const setActiveProjectPath = useSessionsStore((s) => s.setActiveProjectPath);
  const openProject = useSessionsStore((s) => s.openProject);
  const closeProject = useSessionsStore((s) => s.closeProject);

  const handleAddProject = async () => {
    const path = await window.api.dialog.openDirectory();
    if (path) openProject(path);
  };

  const handleClose = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    closeProject(path);
  };

  const handleAuxClick = (e: React.MouseEvent, path: string) => {
    if (e.button === 1) {
      e.preventDefault();
      closeProject(path);
    }
  };

  return (
    <div className="no-drag flex items-center gap-0 overflow-x-auto ml-[68px] scrollbar-none">
      {openProjects.map((path) => {
        const name = path.split("/").pop() ?? path;
        const isActive = path === activeProjectPath;

        return (
          <button
            key={path}
            onClick={() => setActiveProjectPath(path)}
            onAuxClick={(e) => handleAuxClick(e, path)}
            className={cn(
              "group relative flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors shrink-0",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <FolderOpen className="h-3 w-3 shrink-0" />
            <span className="max-w-[140px] truncate">{name}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => handleClose(e, path)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleClose(e as unknown as React.MouseEvent, path);
              }}
              className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm opacity-0 transition-opacity hover:bg-muted-foreground/20 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        );
      })}

      <button
        onClick={handleAddProject}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
