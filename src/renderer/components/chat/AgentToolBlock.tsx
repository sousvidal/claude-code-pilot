import { useQuery } from "@tanstack/react-query";

import { useSessionsStore } from "~/stores/sessions";
import { useSessionsService } from "~/services/sessions.service";
import { parseTurns } from "~/lib/parse-turns";
import { truncate } from "~/lib/utils";
import { SubAgentBlock } from "./SubAgentBlock";
import { TurnBlock } from "./TurnBlock";

interface AgentToolBlockProps {
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
  isLive?: boolean;
}

export function AgentToolBlock({ toolName, toolUseId, input, isLive }: AgentToolBlockProps) {
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const activeProjectPath = useSessionsStore((s) => s.activeProjectPath);
  const { getSubagentMessages } = useSessionsService();

  const { data: subagentMessages = [] } = useQuery({
    queryKey: ["subagentMessages", activeSessionId, toolUseId],
    queryFn: () =>
      getSubagentMessages(activeSessionId!, toolUseId, activeProjectPath ?? undefined),
    enabled: Boolean(activeSessionId) && !isLive,
  });

  const turns = parseTurns(subagentMessages);
  const description = typeof input.description === "string"
    ? truncate(input.description, 50)
    : typeof input.prompt === "string"
      ? truncate(input.prompt, 50)
      : "—";

  return (
    <SubAgentBlock
      agentType={toolName}
      messageCount={subagentMessages.length > 0 ? turns.length : undefined}
      isRunning={isLive}
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
          isLive={false}
        />
      ))}
    </SubAgentBlock>
  );
}
