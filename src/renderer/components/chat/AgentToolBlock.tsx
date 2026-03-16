import { useQuery } from "@tanstack/react-query";

import { useLiveSessionStore } from "~/stores/liveSession";
import { useSessionsStore } from "~/stores/sessions";
import { useSessionsService } from "~/services/sessions.service";
import { parseTurns } from "~/lib/parse-turns";
import { truncate } from "~/lib/utils";
import type { ToolResult } from "../../../shared/types";
import { SubAgentBlock } from "./SubAgentBlock";
import { TurnBlock } from "./TurnBlock";

interface AgentToolBlockProps {
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
  result?: ToolResult;
  isLive?: boolean;
}

export function AgentToolBlock({ toolName, toolUseId, input, result, isLive }: AgentToolBlockProps) {
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const activeProjectPath = useSessionsStore((s) => s.activeProjectPath);
  const liveMessages = useLiveSessionStore((s) => s.messages);
  const { getSubagentMessages } = useSessionsService();

  const subagentLiveMessages = liveMessages
    .filter((m) => (m as { parent_tool_use_id?: string | null }).parent_tool_use_id === toolUseId);

  const { data: subagentMessages = [] } = useQuery({
    queryKey: ["subagentMessages", activeSessionId, toolUseId],
    queryFn: () =>
      getSubagentMessages(activeSessionId ?? "", toolUseId, activeProjectPath ?? undefined),
    enabled: Boolean(activeSessionId) && !isLive,
  });

  const rawMessages = isLive ? subagentLiveMessages : subagentMessages;
  const turns = parseTurns(rawMessages);
  const agentIsRunning = isLive && !result;

  const description = typeof input.description === "string"
    ? truncate(input.description, 50)
    : typeof input.prompt === "string"
      ? truncate(input.prompt, 50)
      : "—";

  return (
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
  );
}
