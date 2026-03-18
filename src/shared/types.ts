export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  extension?: string;
  children?: FileTreeNode[];
}

export interface Turn {
  number: number;
  timestamp: string;
  userMessage: TurnUserMessage | null;
  assistantBlocks: AssistantBlock[];
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  costUsd?: number;
}

export interface TurnUserMessage {
  text: string;
  timestamp: string;
}

export type AssistantBlock =
  | TextBlock
  | ThinkingBlock
  | ToolUseBlock;

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: ToolResult;
}

export interface ToolResult {
  content: string;
  isError: boolean;
  durationMs?: number;
  bytes?: number;
}

export type ToolName =
  | "Read"
  | "Bash"
  | "WebSearch"
  | "Edit"
  | "Write"
  | "Glob"
  | "WebFetch"
  | "Grep"
  | "Agent"
  | "Task"
  | "TaskCreate"
  | "TaskUpdate";

export interface PermissionRequest {
  id: string;
  sessionId: string;
  toolName: string;
  toolUseId: string;
  toolInput: Record<string, unknown>;
}

export interface SlashCommand {
  name: string;
  description: string;
  source: "builtin" | "user" | "project";
}

export interface AutoApprovedEvent {
  toolName: string;
  toolUseId: string;
  sessionId: string;
  toolInput: Record<string, unknown>;
}

export type FileOperation = "created" | "modified" | "deleted";

export interface TouchedFile {
  path: string;
  operation: FileOperation;
}
