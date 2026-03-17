import { useEffect } from "react";
import { FolderOpen } from "lucide-react";

import { useUIStore } from "~/stores/ui";
import { useSessionsStore } from "~/stores/sessions";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "~/components/ui/resizable";
import { Button } from "~/components/ui/button";
import { ProjectTabBar } from "./ProjectTabBar";
import { StatusBar } from "./StatusBar";
import { SessionBrowser } from "~/components/sessions/SessionBrowser";
import { ChatView } from "~/components/chat/ChatView";

function EmptyView() {
  const openProject = useSessionsStore((s) => s.openProject);

  const handleOpenProject = async () => {
    const path = await window.api.dialog.openDirectory();
    if (path) openProject(path);
  };

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="text-5xl font-bold text-muted-foreground/20">Clay</div>
        <p className="text-sm text-muted-foreground">
          Open a project to get started
        </p>
        <Button variant="outline" className="gap-2" onClick={handleOpenProject}>
          <FolderOpen className="h-4 w-4" />
          Open Project
        </Button>
      </div>
    </div>
  );
}

export function AppLayout() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const activeProjectPath = useSessionsStore((s) => s.activeProjectPath);

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    const unsubSessions = useSessionsStore.subscribe((state) => {
      if (!initialized) return;
      void window.api.app.setState({
        openProjects: state.openProjects,
        activeProjectPath: state.activeProjectPath,
        activeSessionId: state.activeSessionId,
        pinnedSessionIds: state.pinnedSessionIds,
      });
    });

    const unsubUI = useUIStore.subscribe((state) => {
      if (!initialized) return;
      void window.api.app.setState({ sidebarCollapsed: state.sidebarCollapsed });
    });

    void window.api.app.getState().then((state) => {
      if (!mounted) return;
      useSessionsStore.setState({
        openProjects: state.openProjects,
        activeProjectPath: state.activeProjectPath,
        activeSessionId: state.activeSessionId,
        pinnedSessionIds: state.pinnedSessionIds ?? [],
      });
      useUIStore.setState({ sidebarCollapsed: state.sidebarCollapsed });
      initialized = true;
    });

    return () => {
      mounted = false;
      unsubSessions();
      unsubUI();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.metaKey || e.ctrlKey) {
        if (e.key === "b") {
          e.preventDefault();
          toggleSidebar();
        }
        if (e.key === "k") {
          e.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>(
            "[data-search-sessions]",
          );
          if (searchInput) {
            searchInput.focus();
          }
        }
      }

      if (e.key === "/" && !isInputFocused) {
        e.preventDefault();
        const chatInput = document.querySelector<HTMLTextAreaElement>(
          "[data-chat-input]",
        );
        chatInput?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <div className="drag-region flex h-[38px] shrink-0 items-center border-b border-border bg-card/80 px-2 backdrop-blur-sm">
        <ProjectTabBar />
      </div>

      {activeProjectPath ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {!sidebarCollapsed && (
            <>
              <ResizablePanel
                defaultSize={22}
                minSize={15}
                maxSize={40}
                order={1}
              >
                <SessionBrowser />
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}

          <ResizablePanel defaultSize={78} minSize={40} order={2}>
            <ChatView />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <EmptyView />
      )}

      <StatusBar />
    </div>
  );
}
