import type { AutoApprovedEvent, FileTreeNode, PermissionRequest } from "./types";

interface Window {
  api: {
    sessions: {
      list: (dir?: string) => Promise<unknown[]>;
      getMessages: (sessionId: string, dir?: string) => Promise<unknown[]>;
      getSubagentMessages: (sessionId: string, toolUseId: string, dir?: string) => Promise<unknown[]>;
    };
    claude: {
      start: (prompt: string, options: Record<string, unknown>) => Promise<void>;
      cancel: (sessionId?: string) => Promise<void>;
      setModel: (model: string) => Promise<void>;
      models: () => Promise<unknown[]>;
      onMessage: (callback: (message: unknown) => void) => () => void;
      onError: (callback: (error: unknown) => void) => () => void;
      onDone: (callback: (event: { correlationId: string; sessionId: string | null }) => void) => () => void;
    };
    files: {
      readDir: (dirPath: string) => Promise<FileTreeNode[]>;
      readFile: (filePath: string) => Promise<string>;
      writeFile: (filePath: string, content: string) => Promise<void>;
    };
    dialog: {
      openDirectory: () => Promise<string | null>;
    };
    permission: {
      onRequest: (callback: (request: PermissionRequest) => void) => () => void;
      onAutoApproved: (callback: (event: AutoApprovedEvent) => void) => () => void;
      respond: (id: string, decision: "allow" | "deny") => void;
      alwaysAllow: (toolName: string) => Promise<void>;
    };
  };
}
