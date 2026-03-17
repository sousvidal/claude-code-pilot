import type { AutoApprovedEvent, FileTreeNode, PermissionRequest, SlashCommand } from "./types";

interface PersistedAppState {
  openProjects: string[];
  activeProjectPath: string | null;
  activeSessionId: string | null;
  sidebarCollapsed: boolean;
  pinnedSessionIds: string[];
}

interface Window {
  api: {
    app: {
      getState: () => Promise<PersistedAppState>;
      setState: (partial: Partial<PersistedAppState>) => Promise<void>;
    };
    sessions: {
      list: (dir?: string) => Promise<unknown[]>;
      getMessages: (sessionId: string, dir?: string) => Promise<unknown[]>;
      getSubagentMessages: (sessionId: string, toolUseId: string, dir?: string) => Promise<unknown[]>;
      delete: (sessionId: string, dir?: string) => Promise<void>;
    };
    claude: {
      start: (prompt: string, options: Record<string, unknown>) => Promise<void>;
      cancel: (sessionId?: string) => Promise<void>;
      setModel: (model: string) => Promise<void>;
      models: () => Promise<unknown[]>;
      authStatus: () => Promise<{
        loggedIn: boolean;
        authMethod?: string;
        subscriptionType?: string;
        email?: string;
      }>;
      usageData: () => Promise<{
        fiveHour?: { utilization: number; resetsAt?: string };
        sevenDay?: { utilization: number; resetsAt?: string };
        sevenDayOpus?: { utilization: number; resetsAt?: string };
        sevenDaySonnet?: { utilization: number; resetsAt?: string };
        extraUsage?: { isEnabled: boolean; monthlyLimit?: number; usedCredits?: number; utilization?: number };
      } | null>;
      usageStats: () => Promise<{
        totalSessions: number;
        totalMessages: number;
        firstSessionDate: string | null;
        dailyActivity: Array<{ date: string; messageCount: number; sessionCount: number; toolCallCount: number }>;
        modelUsage: Record<string, { inputTokens: number; outputTokens: number; costUSD: number }>;
      }>;
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
    shell: {
      openExternal: (url: string) => Promise<void>;
    };
    commands: {
      list: (projectPath?: string) => Promise<SlashCommand[]>;
    };
    permission: {
      onRequest: (callback: (request: PermissionRequest) => void) => () => void;
      onAutoApproved: (callback: (event: AutoApprovedEvent) => void) => () => void;
      respond: (id: string, decision: "allow" | "deny") => void;
      alwaysAllow: (toolName: string) => Promise<void>;
    };
  };
}
