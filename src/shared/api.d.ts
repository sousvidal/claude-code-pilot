import type { FileTreeNode } from "./types";

interface Window {
  api: {
    sessions: {
      list: (dir?: string) => Promise<unknown[]>;
      getMessages: (sessionId: string, dir?: string) => Promise<unknown[]>;
      getSubagentMessages: (sessionId: string, toolUseId: string, dir?: string) => Promise<unknown[]>;
    };
    claude: {
      start: (prompt: string, options: Record<string, unknown>) => Promise<void>;
      send: (message: string) => Promise<void>;
      cancel: () => Promise<void>;
      setModel: (model: string) => Promise<void>;
      models: () => Promise<unknown[]>;
      onMessage: (callback: (message: unknown) => void) => () => void;
      onError: (callback: (error: unknown) => void) => () => void;
      onDone: (callback: () => void) => () => void;
    };
    files: {
      readDir: (dirPath: string) => Promise<FileTreeNode[]>;
      readFile: (filePath: string) => Promise<string>;
    };
    dialog: {
      openDirectory: () => Promise<string | null>;
    };
  };
}
