import { useCallback, useRef, useState } from "react";
import { Send, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Toggle } from "~/components/ui/toggle";
import { cn } from "~/lib/utils";
import { useLiveSessionStore } from "~/stores/liveSession";
import { useSessionsStore } from "~/stores/sessions";

const EFFORT_LEVELS = ["low", "medium", "high"] as const;
const MODELS = ["sonnet", "opus", "haiku"];
const MAX_TEXTAREA_HEIGHT = 144; // 6 lines × 24px line-height

export function ChatInput() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [effort, setEffort] = useState<"low" | "medium" | "high">("high");
  const [selectedModel, setSelectedModel] = useState("sonnet");

  const activeProjectPath = useSessionsStore((s) => s.activeProjectPath);
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const isRunning = useLiveSessionStore((s) => s.isRunning);
  const liveSessionId = useLiveSessionStore((s) => s.liveSessionId);
  const setRunning = useLiveSessionStore((s) => s.setRunning);
  const resetLiveSession = useLiveSessionStore((s) => s.resetLiveSession);
  const setCurrentModel = useLiveSessionStore((s) => s.setCurrentModel);
  const addMessage = useLiveSessionStore((s) => s.addMessage);

  const shouldContinueSession =
    liveSessionId !== null && liveSessionId === activeSessionId;

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isRunning) return;

    setInput("");

    const userMsg = {
      type: "user",
      message: { role: "user", content: [{ type: "text", text }] },
      timestamp: new Date().toISOString(),
    };

    if (shouldContinueSession) {
      resetLiveSession();
      setRunning(true);
      addMessage(userMsg);
      try {
        await window.api.claude.send(text);
      } finally {
        setRunning(false);
      }
    } else {
      resetLiveSession();
      setRunning(true);
      setCurrentModel(selectedModel);
      addMessage(userMsg);
      try {
        await window.api.claude.start(text, {
          cwd: activeProjectPath ?? undefined,
          model: selectedModel,
          effort,
          resume: activeSessionId ?? undefined,
        });
      } finally {
        setRunning(false);
      }
    }
  }, [
    input,
    isRunning,
    shouldContinueSession,
    selectedModel,
    effort,
    activeProjectPath,
    activeSessionId,
    setRunning,
    resetLiveSession,
    setCurrentModel,
    addMessage,
  ]);

  const handleCancel = useCallback(() => {
    window.api.claude.cancel();
    setRunning(false);
    resetLiveSession();
  }, [setRunning, resetLiveSession]);

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

  return (
    <div className="shrink-0 border-t border-border bg-card/80 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl">
        <textarea
          data-chat-input
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          placeholder={isRunning ? "Claude is thinking..." : "Type your message..."}
          rows={1}
          className={cn(
            "w-full resize-none rounded-xl bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-70",
            "min-h-[40px] max-h-[144px]",
          )}
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/50 p-0.5">
              {EFFORT_LEVELS.map((level) => (
                <Toggle
                  key={level}
                  size="sm"
                  pressed={effort === level}
                  onPressedChange={() => setEffort(level)}
                  className="h-7 px-2 text-xs capitalize"
                >
                  {level}
                </Toggle>
              ))}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  {selectedModel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {MODELS.map((model) => (
                  <DropdownMenuItem
                    key={model}
                    onClick={() => setSelectedModel(model)}
                  >
                    {model}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-1">
            {isRunning ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-full text-accent-red hover:bg-accent-red/10 hover:text-accent-red"
                onClick={handleCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="h-9 w-9 rounded-full bg-accent-blue text-white hover:bg-accent-blue/90"
                onClick={handleSend}
                disabled={!input.trim() || !activeProjectPath}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
