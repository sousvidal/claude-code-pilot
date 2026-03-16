import type { AssistantBlock } from "../../../shared/types";
import { TextBlock } from "./TextBlock";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCallBlock } from "./ToolCallBlock";
import { AgentToolBlock } from "./AgentToolBlock";

interface AssistantMessageProps {
  blocks: AssistantBlock[];
  isLive?: boolean;
}

export function AssistantMessage({ blocks, isLive }: AssistantMessageProps) {
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => {
        if (block.type === "text") {
          return <TextBlock key={`text-${i}`} text={block.text} />;
        }
        if (block.type === "thinking") {
          return <ThinkingBlock key={`thinking-${i}`} thinking={block.thinking} />;
        }
        if (block.type === "tool_use") {
          if (block.name === "Agent" || block.name === "Task") {
            return (
              <AgentToolBlock
                key={block.id}
                toolName={block.name}
                toolUseId={block.id}
                input={block.input}
                result={block.result}
                isLive={isLive}
              />
            );
          }
          return (
            <ToolCallBlock
              key={block.id}
              toolUseId={block.id}
              toolName={block.name}
              input={block.input}
              result={block.result}
              isError={block.result?.isError ?? false}
              isLive={isLive}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
