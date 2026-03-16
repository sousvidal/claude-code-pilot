import { useEffect } from "react";
import { PanelLeft, PanelRight } from "lucide-react";

import { useUIStore } from "~/stores/ui";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "~/components/ui/resizable";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useEditorStore } from "~/stores/editor";
import { SessionBrowser } from "~/components/sessions/SessionBrowser";
import { ChatView } from "~/components/chat/ChatView";
import { FileExplorer } from "~/components/files/FileExplorer";
import { CodeEditor } from "~/components/editor/CodeEditor";

export function AppLayout() {
  const {
    leftSidebarCollapsed,
    rightSidebarCollapsed,
    toggleLeftSidebar,
    toggleRightSidebar,
  } = useUIStore();
  const activeFilePath = useEditorStore((s) => s.activeFilePath);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.metaKey || e.ctrlKey) {
        if (e.key === "b") {
          e.preventDefault();
          toggleLeftSidebar();
        }
        if (e.key === "e") {
          e.preventDefault();
          toggleRightSidebar();
        }
        if (e.key === "k") {
          e.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>(
            "[data-search-sessions]",
          );
          searchInput?.focus();
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
  }, [toggleLeftSidebar, toggleRightSidebar]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <div className="drag-region flex h-[38px] shrink-0 items-center justify-between border-b border-border bg-card/80 px-2 backdrop-blur-sm">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="no-drag ml-[68px] h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={toggleLeftSidebar}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {leftSidebarCollapsed ? "Show" : "Hide"} sessions (⌘B)
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="no-drag h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={toggleRightSidebar}
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {rightSidebarCollapsed ? "Show" : "Hide"} files (⌘E)
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {!leftSidebarCollapsed && (
          <>
            <ResizablePanel
              defaultSize={20}
              minSize={15}
              maxSize={35}
              order={1}
            >
              <SessionBrowser />
            </ResizablePanel>
            <ResizableHandle />
          </>
        )}

        <ResizablePanel defaultSize={60} minSize={30} order={2}>
          <ChatView />
        </ResizablePanel>

        {activeFilePath && (
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={35} minSize={20} order={3}>
              <CodeEditor />
            </ResizablePanel>
          </>
        )}

        {!rightSidebarCollapsed && (
          <>
            <ResizableHandle />
            <ResizablePanel
              defaultSize={20}
              minSize={15}
              maxSize={35}
              order={4}
            >
              <FileExplorer />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
