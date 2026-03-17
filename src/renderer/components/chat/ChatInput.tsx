import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Send, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import { useLiveSessionStore } from "~/stores/liveSession";
import { useSessionsStore } from "~/stores/sessions";

const EFFORT_LEVELS = ["low", "medium", "high"] as const;
const MODELS = ["sonnet", "opus", "haiku"];
const MAX_TEXTAREA_HEIGHT = 144; // 6 lines × 24px line-height

export function ChatInput() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentRunCorrelationIdRef = useRef<string | null>(null);
  const [input, setInput] = useState("");
  const [effort, setEffort] = useState<"low" | "medium" | "high">("high");
  const [selectedModel, setSelectedModel] = useState("sonnet");

  const activeProjectPath = useSessionsStore((s) => s.activeProjectPath);
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const setPendingNewSession = useSessionsStore((s) => s.setPendingNewSession);

  const startRun = useLiveSessionStore((s) => s.startRun);
  const endRun = useLiveSessionStore((s) => s.endRun);
  const setCurrentModel = useLiveSessionStore((s) => s.setCurrentModel);
  const addMessageToRun = useLiveSessionStore((s) => s.addMessageToRun);

  // The active session is "running" if there is a run whose sessionId matches, or
  // (for new chats with no activeSessionId) if there is any run with no sessionId yet.
  const isRunning = useLiveSessionStore((s) => {
    if (activeSessionId) {
      return [...s.runningSessions.values()].some((r) => r.sessionId === activeSessionId);
    }
    return [...s.runningSessions.values()].some((r) => r.sessionId === null);
  });

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isRunning) return;

    setInput("");

    const correlationId = crypto.randomUUID();
    currentRunCorrelationIdRef.current = correlationId;

    const userMsg = {
      type: "user",
      message: { role: "user", content: [{ type: "text", text }] },
      timestamp: new Date().toISOString(),
    };

    if (!activeSessionId) {
      // New chat — show optimistic pending entry in sidebar
      setPendingNewSession({ projectPath: activeProjectPath!, firstPrompt: text });
    }

    startRun(correlationId);
    setCurrentModel(selectedModel);
    addMessageToRun(correlationId, userMsg);

    try {
      await window.api.claude.start(text, {
        cwd: activeProjectPath ?? undefined,
        model: selectedModel,
        effort,
        resume: activeSessionId ?? undefined,
        correlationId,
      });
    } finally {
      endRun(correlationId);
      currentRunCorrelationIdRef.current = null;
    }
  }, [
    input,
    isRunning,
    activeSessionId,
    activeProjectPath,
    selectedModel,
    effort,
    setPendingNewSession,
    startRun,
    endRun,
    setCurrentModel,
    addMessageToRun,
  ]);

  const handleCancel = useCallback(() => {
    window.api.claude.cancel(activeSessionId ?? undefined);
    // Immediately remove the run for instant UI feedback
    if (currentRunCorrelationIdRef.current) {
      endRun(currentRunCorrelationIdRef.current);
      currentRunCorrelationIdRef.current = null;
    }
  }, [activeSessionId, endRun]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    if (!isRunning) textareaRef.current?.focus();
  }, [isRunning]);

  if (!activeProjectPath) return null;

  return (
    <div className="shrink-0 border-t border-border bg-card/80 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end gap-2">
          <textarea
            data-chat-input
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isRunning}
            placeholder={isRunning ? "Claude is thinking..." : "Type your message..."}
            autoFocus
            rows={1}
            className={cn(
              "flex-1 resize-none rounded-xl bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-70",
              "min-h-[40px] max-h-[144px]",
            )}
          />
          {isRunning ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0 rounded-full text-accent-red hover:bg-accent-red/10 hover:text-accent-red"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full bg-accent-blue text-white hover:bg-accent-blue/90"
              onClick={handleSend}
              disabled={!input.trim() || !activeProjectPath}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-5 items-center gap-0.5 rounded px-1.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground">
                <span className="capitalize">{effort}</span>
                <ChevronDown className="h-2.5 w-2.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {EFFORT_LEVELS.map((level) => (
                <DropdownMenuItem
                  key={level}
                  onClick={() => setEffort(level)}
                  className={cn("capitalize", effort === level && "font-medium")}
                >
                  {level}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-5 items-center gap-0.5 rounded px-1.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground">
                <span>{selectedModel}</span>
                <ChevronDown className="h-2.5 w-2.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {MODELS.map((model) => (
                <DropdownMenuItem
                  key={model}
                  onClick={() => setSelectedModel(model)}
                  className={cn(selectedModel === model && "font-medium")}
                >
                  {model}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
