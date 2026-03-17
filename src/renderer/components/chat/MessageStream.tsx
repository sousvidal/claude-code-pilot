import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { parseTurnsIncremental } from "~/lib/parse-turns";
import type { Turn } from "../../../shared/types";
import { TurnBlock } from "./TurnBlock";

interface MessageStreamProps {
  messages: unknown[];
  isLive?: boolean;
}

export function MessageStream({ messages, isLive }: MessageStreamProps) {
  const parentMessages = useMemo(
    () => messages.filter(
      (m) => !(m as { parent_tool_use_id?: string | null }).parent_tool_use_id,
    ),
    [messages],
  );
  const prevRef = useRef<{ turns: Turn[]; count: number }>({ turns: [], count: 0 });
  const turns = useMemo(() => {
    const result = parseTurnsIncremental(
      prevRef.current.turns,
      prevRef.current.count,
      parentMessages,
    );
    prevRef.current = { turns: result, count: parentMessages.length };
    return result;
  }, [parentMessages]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const scrollToBottom = useCallback(() => {
    bottomSentinelRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const sentinel = bottomSentinelRef.current;
    const scrollArea = scrollAreaRef.current;
    if (!sentinel || !scrollArea) return;

    const viewport = scrollArea.querySelector("[data-radix-scroll-area-viewport]");
    if (!viewport) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollToBottom(!entry?.isIntersecting);
      },
      { root: viewport as Element, rootMargin: "0px", threshold: 1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative flex-1 overflow-hidden">
      <ScrollArea className="h-full" ref={scrollAreaRef}>
        <div className="mx-auto max-w-3xl px-6 py-4">
          {turns.map((turn, i) => (
            <TurnBlock
              key={turn.number}
              turnNumber={turn.number}
              timestamp={turn.timestamp}
              userMessage={turn.userMessage}
              assistantBlocks={turn.assistantBlocks}
              isFirst={i === 0}
              isLive={isLive}
            />
          ))}
          <div ref={bottomSentinelRef} className="h-px" aria-hidden />
        </div>
      </ScrollArea>
      {showScrollToBottom && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-4 right-8 h-9 w-9 rounded-full shadow-lg"
          onClick={scrollToBottom}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
