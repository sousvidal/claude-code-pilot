import type { AssistantBlock, TurnUserMessage } from "../../../shared/types";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { AssistantMessage } from "./AssistantMessage";
import { UserMessage } from "./UserMessage";

interface TurnBlockProps {
  turnNumber: number;
  timestamp: string;
  userMessage: TurnUserMessage | null;
  assistantBlocks: AssistantBlock[];
  isFirst: boolean;
  isLive?: boolean;
}

export function TurnBlock({
  turnNumber,
  timestamp,
  userMessage,
  assistantBlocks,
  isFirst,
  isLive,
}: TurnBlockProps) {
  return (
    <div className="flex flex-col gap-4">
      {!isFirst && <Separator className="my-2" />}
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className="flex h-6 w-6 items-center justify-center rounded-full p-0 text-xs"
        >
          {turnNumber}
        </Badge>
        <span className="text-xs text-muted-foreground">{timestamp}</span>
      </div>
      {userMessage && <UserMessage message={userMessage} />}
      {assistantBlocks.length > 0 && (
        <AssistantMessage blocks={assistantBlocks} isLive={isLive} />
      )}
    </div>
  );
}
