import type {
  Turn,
  TurnUserMessage,
  AssistantBlock,
  TextBlock,
  ThinkingBlock,
  ToolUseBlock,
  ToolResult,
} from "../../shared/types";

interface SdkContentBlock {
  type?: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}

interface SdkMessage {
  type?: string;
  subtype?: string;
  message?: {
    content?: string | SdkContentBlock[];
    role?: string;
  };
  tool_use_result?: unknown;
  timestamp?: string;
}

function extractUserText(msg: SdkMessage): string {
  const content = msg.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b): b is SdkContentBlock => b?.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n");
}

function extractAssistantBlocks(msg: SdkMessage): AssistantBlock[] {
  const content = msg.message?.content;
  if (!Array.isArray(content)) return [];

  const blocks: AssistantBlock[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "text" && typeof block.text === "string") {
      blocks.push({ type: "text", text: block.text } satisfies TextBlock);
    } else if (block.type === "thinking" && typeof block.thinking === "string") {
      blocks.push({ type: "thinking", thinking: block.thinking } satisfies ThinkingBlock);
    } else if (
      block.type === "tool_use" &&
      typeof block.id === "string" &&
      typeof block.name === "string"
    ) {
      blocks.push({
        type: "tool_use",
        id: block.id,
        name: block.name,
        input: (block.input as Record<string, unknown>) ?? {},
      } satisfies ToolUseBlock);
    }
  }
  return blocks;
}

function parseToolResult(raw: unknown): ToolResult | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "object" && "content" in raw) {
    const obj = raw as { content?: unknown; is_error?: boolean; duration_ms?: number };
    const content = Array.isArray(obj.content)
      ? obj.content
        .filter((c): c is { type?: string; text?: string } => c?.type === "text")
        .map((c) => c.text ?? "")
        .join("\n")
      : typeof obj.content === "string"
        ? obj.content
        : JSON.stringify(obj.content);
    return {
      content,
      isError: Boolean(obj.is_error),
      durationMs: typeof obj.duration_ms === "number" ? obj.duration_ms : undefined,
    };
  }
  return {
    content: typeof raw === "string" ? raw : JSON.stringify(raw),
    isError: false,
  };
}

function isToolResultUserMessage(msg: SdkMessage): boolean {
  if ("tool_use_result" in msg) return true;
  const content = msg.message?.content;
  if (Array.isArray(content) && content.length > 0) {
    return content[0]?.type === "tool_result";
  }
  return false;
}

function collectToolResults(messages: unknown[]): Map<string, ToolResult> {
  const toolResults = new Map<string, ToolResult>();
  for (const raw of messages) {
    const msg = raw as SdkMessage;
    if (msg?.type === "user") {
      if ("tool_use_result" in msg) {
        // Live streaming format: top-level tool_use_result + tool_use_id
        const userWithResult = msg as SdkMessage & { tool_use_result?: unknown; tool_use_id?: string };
        const result = parseToolResult(userWithResult.tool_use_result);
        if (result && userWithResult.tool_use_id) {
          toolResults.set(userWithResult.tool_use_id, result);
        }
      } else if (Array.isArray(msg.message?.content)) {
        // Stored JSONL format: tool_result blocks inside message.content
        for (const block of msg.message!.content as SdkContentBlock[]) {
          if (block?.type === "tool_result" && typeof block.tool_use_id === "string") {
            const result = parseToolResult(block);
            if (result) toolResults.set(block.tool_use_id, result);
          }
        }
      }
    } else if (msg?.type === "result" && msg.subtype === "success") {
      const resultMsg = msg as {
        tool_results?: Array<{ tool_use_id?: string; content?: unknown; is_error?: boolean }>;
      };
      const results = resultMsg.tool_results;
      if (Array.isArray(results)) {
        for (const r of results) {
          if (r?.tool_use_id) {
            const parsed = parseToolResult(r);
            if (parsed) toolResults.set(r.tool_use_id, parsed);
          }
        }
      }
    }
  }
  return toolResults;
}

export function parseTurns(messages: unknown[]): Turn[] {
  const turns: Turn[] = [];
  let turnIndex = 0;
  const toolResults = collectToolResults(messages);

  for (let i = 0; i < messages.length; i++) {
    const raw = messages[i];
    const msg = raw as SdkMessage;

    if (msg?.type === "user" && !isToolResultUserMessage(msg)) {
      const text = extractUserText(msg);
      const userMessage: TurnUserMessage = {
        text,
        timestamp: msg.timestamp ?? new Date().toISOString(),
      };

      const assistantBlocks: AssistantBlock[] = [];
      let j = i + 1;
      while (j < messages.length) {
        const next = messages[j] as SdkMessage;
        if (next?.type === "assistant") {
          const blocks = extractAssistantBlocks(next);
          for (const block of blocks) {
            if (block.type === "tool_use") {
              const result = toolResults.get(block.id);
              assistantBlocks.push({
                ...block,
                result,
              });
            } else {
              assistantBlocks.push(block);
            }
          }
          j++;
        } else if (next?.type === "user" && isToolResultUserMessage(next)) {
          j++;
        } else if (next?.type === "user") {
          break; // next human turn starts
        } else {
          j++; // skip system, result, progress, etc.
        }
      }

      turnIndex++;
      turns.push({
        number: turnIndex,
        timestamp: userMessage.timestamp,
        userMessage,
        assistantBlocks,
      });
      i = j - 1;
    }
  }

  return turns;
}
