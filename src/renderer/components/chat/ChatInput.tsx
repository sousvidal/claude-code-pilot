import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Send, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import { useCommandsService } from "~/services/commands.service";
import { useLiveSessionStore } from "~/stores/liveSession";
import { useSessionsStore } from "~/stores/sessions";

const EFFORT_LEVELS = ["low", "medium", "high"] as const;
const MODELS = ["sonnet", "opus", "haiku"];
const MAX_TEXTAREA_HEIGHT = 144; // 6 lines × 24px line-height

/** Returns the slash-command token at the cursor, or null if not in one. */
/** Returns the index of the start of the last whitespace-delimited word in `str`. */
function getWordStart(str: string): number {
  const match = str.search(/\S+$/);
  return match === -1 ? str.length : match;
}

function getSlashToken(value: string, cursorPos: number): string | null {
  const before = value.slice(0, cursorPos);
  const word = before.slice(getWordStart(before));
  if (word.startsWith("/")) return word.slice(1);
  return null;
}

export function ChatInput() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentRunCorrelationIdRef = useRef<string | null>(null);
  const [input, setInput] = useState("");
  const [effort, setEffort] = useState<"low" | "medium" | "high">("high");
  const [selectedModel, setSelectedModel] = useState("sonnet");

  // Autocomplete state
  const [slashToken, setSlashToken] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeProjectPath = useSessionsStore((s) => s.activeProjectPath);
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const setPendingNewSession = useSessionsStore((s) => s.setPendingNewSession);

  const startRun = useLiveSessionStore((s) => s.startRun);
  const endRun = useLiveSessionStore((s) => s.endRun);
  const setCurrentModel = useLiveSessionStore((s) => s.setCurrentModel);
  const addMessageToRun = useLiveSessionStore((s) => s.addMessageToRun);

  const { listCommands } = useCommandsService();

  const { data: allCommands = [] } = useQuery({
    queryKey: ["commands", activeProjectPath],
    queryFn: () => listCommands(activeProjectPath ?? undefined),
    staleTime: 60_000,
  });

  const filteredCommands = useMemo(
    () => (slashToken !== null ? allCommands.filter((c) => c.name.startsWith(slashToken)) : []),
    [slashToken, allCommands],
  );

  // The active session is "running" if there is a run whose sessionId matches, or
  // (for new chats with no activeSessionId) if there is any run with no sessionId yet.
  const isRunning = useLiveSessionStore((s) => {
    if (activeSessionId) {
      return [...s.runningSessions.values()].some((r) => r.sessionId === activeSessionId);
    }
    return [...s.runningSessions.values()].some((r) => r.sessionId === null);
  });

  const isAutocompleteOpen = slashToken !== null && filteredCommands.length > 0;

  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, filteredCommands.length - 1)));
  }, [filteredCommands.length]);

  const applyCommand = useCallback(
    (name: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const cursorPos = el.selectionStart ?? input.length;
      const before = input.slice(0, cursorPos);
      const after = input.slice(cursorPos);
      const wordStart = getWordStart(before);
      const newValue = before.slice(0, wordStart) + `/${name} ` + after;
      setInput(newValue);
      setSlashToken(null);
      // Place cursor after inserted command
      const newCursor = wordStart + name.length + 2;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(newCursor, newCursor);
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
      });
    },
    [input],
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isRunning) return;

    setInput("");
    setSlashToken(null);

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
      if (isAutocompleteOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          const cmd = filteredCommands[selectedIndex];
          if (cmd) applyCommand(cmd.name);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setSlashToken(null);
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [isAutocompleteOpen, filteredCommands, selectedIndex, applyCommand, handleSend],
  );

  const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    setSlashToken(getSlashToken(el.value, el.selectionStart ?? el.value.length));
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    const token = getSlashToken(value, e.target.selectionStart ?? value.length);
    setSlashToken(token);
    setSelectedIndex(0);

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
        <div className="relative flex items-end gap-2">
          {/* Autocomplete dropdown */}
          {isAutocompleteOpen && (
            <div className="absolute bottom-full left-0 right-10 mb-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
              {filteredCommands.map((cmd, i) => (
                <button
                  key={cmd.name}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent textarea blur
                    applyCommand(cmd.name);
                  }}
                  className={cn(
                    "flex w-full items-baseline gap-3 px-3 py-2 text-left text-sm",
                    i === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <span className="shrink-0 font-mono font-medium">/{cmd.name}</span>
                  {cmd.description && (
                    <span className="truncate text-xs text-muted-foreground">{cmd.description}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          <textarea
            data-chat-input
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onSelect={handleSelect}
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
