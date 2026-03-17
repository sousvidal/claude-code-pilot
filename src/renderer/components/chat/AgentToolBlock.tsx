import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useLiveSessionStore } from "~/stores/liveSession";
import { useSessionsStore } from "~/stores/sessions";
import { useSessionsService } from "~/services/sessions.service";
import { parseTurns } from "~/lib/parse-turns";
import { ErrorBoundary } from "~/components/ui/error-boundary";
import type { ToolResult } from "../../../shared/types";
import { SubAgentBlock } from "./SubAgentBlock";
import { TurnBlock } from "./TurnBlock";

interface AgentToolBlockProps {
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
  result?: ToolResult;
  isLive?: boolean;
  isRunning?: boolean;
}

const EMPTY_MESSAGES: unknown[] = [];

export function AgentToolBlock({ toolName, toolUseId, input, result, isLive, isRunning }: AgentToolBlockProps) {
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const activeProjectPath = useSessionsStore((s) => s.activeProjectPath);
  const activeRun = useLiveSessionStore((s) =>
    activeSessionId
      ? [...s.runningSessions.values()].find((r) => r.sessionId === activeSessionId) ?? null
      : null,
  );
  const { getSubagentMessages } = useSessionsService();
  const liveMessages = activeRun?.messages ?? EMPTY_MESSAGES;

  const subagentLiveMessages = useMemo(
    () =>
      liveMessages.filter(
        (m) => (m as { parent_tool_use_id?: string | null }).parent_tool_use_id === toolUseId,
      ),
    [liveMessages, toolUseId],
  );

  const { data: subagentMessages = [] } = useQuery({
    queryKey: ["subagentMessages", activeSessionId, toolUseId],
    queryFn: () =>
      getSubagentMessages(activeSessionId ?? "", toolUseId, activeProjectPath ?? undefined),
    enabled: Boolean(activeSessionId) && !isLive,
  });

  const rawMessages = isLive ? subagentLiveMessages : subagentMessages;
  const turns = useMemo(() => parseTurns(rawMessages), [rawMessages]);
  const agentIsRunning = isRunning ?? Boolean(isLive && !result);

  const description = typeof input.description === "string"
    ? input.description
    : typeof input.prompt === "string"
      ? input.prompt
      : "—";

  return (
    <ErrorBoundary fallbackMessage="Failed to render agent block">
      <SubAgentBlock
        agentType={toolName}
        messageCount={rawMessages.length > 0 ? turns.length : undefined}
        isRunning={agentIsRunning}
        summary={description}
      >
        {turns.length > 0 && turns.map((turn, i) => (
          <TurnBlock
            key={turn.number}
            turnNumber={turn.number}
            timestamp={turn.timestamp}
            userMessage={turn.userMessage}
            assistantBlocks={turn.assistantBlocks}
            isFirst={i === 0}
            isLive={agentIsRunning}
          />
        ))}
      </SubAgentBlock>
    </ErrorBoundary>
  );
}
