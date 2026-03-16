import type { AssistantBlock } from "../../../shared/types";
import { ErrorBoundary } from "~/components/ui/error-boundary";
import { TextBlock } from "./TextBlock";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCallBlock } from "./ToolCallBlock";
import { AgentToolBlock } from "./AgentToolBlock";

interface AssistantMessageProps {
  blocks: AssistantBlock[];
  isLive?: boolean;
}

function hasContentAfter(blocks: AssistantBlock[], index: number): boolean {
  for (let j = index + 1; j < blocks.length; j++) {
    const b = blocks[j];
    if (b.type === "text" || b.type === "thinking") return true;
    if (b.type === "tool_use" && b.result) return true;
  }
  return false;
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
          const isToolRunning = Boolean(
            isLive && !block.result && !hasContentAfter(blocks, i),
          );

          if (block.name === "Agent" || block.name === "Task") {
            return (
              <AgentToolBlock
                key={block.id}
                toolName={block.name}
                toolUseId={block.id}
                input={block.input}
                result={block.result}
                isLive={isLive}
                isRunning={isToolRunning}
              />
            );
          }
          return (
            <ErrorBoundary key={block.id} fallbackMessage={`Failed to render ${block.name}`}>
              <ToolCallBlock
                toolUseId={block.id}
                toolName={block.name}
                input={block.input}
                result={block.result}
                isError={block.result?.isError ?? false}
                isRunning={isToolRunning}
                isLive={isLive}
              />
            </ErrorBoundary>
          );
        }
        return null;
      })}
    </div>
  );
}
