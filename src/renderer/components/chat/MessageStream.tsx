import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Button } from "~/components/ui/button";
import { parseTurnsIncremental } from "~/lib/parse-turns";
import type { Turn } from "../../../shared/types";
import { TurnBlock } from "./TurnBlock";

interface MessageStreamProps {
  messages: unknown[];
  isLive?: boolean;
  initialScrollPosition?: number | null;
  onScrollPositionChange?: (position: number | null) => void;
}

export function MessageStream({
  messages,
  isLive,
  initialScrollPosition,
  onScrollPositionChange,
}: MessageStreamProps) {
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const hasRestoredRef = useRef(false);
  const shouldStickToBottomRef = useRef(false);
  const wasNearBottomRef = useRef(true);
  const hasTurns = turns.length > 0;
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const virtualizer = useVirtualizer({
    count: turns.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 200,
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
        ? (el) => el.getBoundingClientRect().height
        : undefined,
    overscan: 3,
    paddingStart: 16,
    paddingEnd: 16,
  });

  const virtualizerTotalSize = virtualizer.getTotalSize();

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const near = isNearBottom();
    wasNearBottomRef.current = near;
    setShowScrollToBottom(!near);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      // Save 0 as a sentinel for "was at bottom" so that on restore the
      // virtualizer-based stick-to-bottom path is used instead of raw scrollTop,
      // which would land at the wrong position before items are measured.
      onScrollPositionChange?.(isNearBottom() ? null : el.scrollTop);
    }, 300);
  }, [isNearBottom, onScrollPositionChange]);

  // Restore scroll position on first non-empty render (instant, no animation).
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (turns.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;

    hasRestoredRef.current = true;
    if (initialScrollPosition != null) {
      el.scrollTop = initialScrollPosition;
      wasNearBottomRef.current = isNearBottom();
      setShowScrollToBottom(!wasNearBottomRef.current);
    } else {
      // Scroll to the last item via the virtualizer so it accounts for actual
      // item sizes as they get measured — more reliable than raw scrollHeight.
      shouldStickToBottomRef.current = true;
      virtualizer.scrollToIndex(turns.length - 1, { align: "end", behavior: "auto" });
      wasNearBottomRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTurns]);

  // After measurement updates the total size, re-scroll to the real bottom
  // until we confirm we're actually there (handles estimate → measured transition).
  useEffect(() => {
    if (!shouldStickToBottomRef.current) return;
    if (turns.length === 0) return;
    virtualizer.scrollToIndex(turns.length - 1, { align: "end", behavior: "auto" });
    // Once we've scrolled, check next frame if we've settled.
    const id = requestAnimationFrame(() => {
      if (isNearBottom()) shouldStickToBottomRef.current = false;
    });
    return () => cancelAnimationFrame(id);
  }, [virtualizerTotalSize, isNearBottom, turns.length, virtualizer]);

  // Auto-scroll to bottom when live messages arrive — only if was near bottom.
  useEffect(() => {
    if (!hasRestoredRef.current) return;
    if (!isLive) return;
    if (wasNearBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [messages, isLive, scrollToBottom]);

  // Cleanup debounce on unmount.
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto"
        onScroll={handleScroll}
      >
        <div
          style={{ height: `${virtualizerTotalSize}px` }}
          className="relative"
        >
          {virtualizer.getVirtualItems().map((vItem) => {
            const turn = turns[vItem.index];
            if (!turn) return null;
            return (
              <div
                key={turn.number}
                data-index={vItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vItem.start}px)`,
                }}
              >
                <div className="mx-auto max-w-6xl px-6">
                  <TurnBlock
                    turnNumber={turn.number}
                    timestamp={turn.timestamp}
                    userMessage={turn.userMessage}
                    assistantBlocks={turn.assistantBlocks}
                    isFirst={vItem.index === 0}
                    isLive={isLive}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {showScrollToBottom && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-4 right-8 h-9 w-9 rounded-full shadow-lg"
          onClick={() => scrollToBottom("smooth")}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
