import { spawn, execFile } from "child_process";
import type { ChildProcess } from "child_process";
import { watch, type FSWatcher } from "fs";
import { stat as fsStat, open as fsOpen, readdir } from "fs/promises";
import { createInterface } from "readline";
import { join } from "path";
import { homedir } from "os";
import { getMainWindow } from "../index";
import { getApprovalServerPort } from "./approval.service";
import { logger } from "../lib/logger";

const log = logger.child({ service: "claude" });

const PROJECTS_DIR = join(homedir(), ".claude", "projects");

interface ProcessContext {
  process: ChildProcess;
  sessionId: string | null;
  cwd: string;
  model: string;
  effort: string;
  stopTailing?: () => void;
}

// Active processes keyed by correlationId
const activeSessions = new Map<string, ProcessContext>();

async function findSessionJsonlPath(
  sessionId: string,
  cwd: string,
): Promise<string | null> {
  const slug = cwd.replace(/[/_]/g, "-");
  const candidate = join(PROJECTS_DIR, slug, `${sessionId}.jsonl`);
  try {
    await fsStat(candidate);
    return candidate;
  } catch {
    try {
      const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const p = join(PROJECTS_DIR, entry.name, `${sessionId}.jsonl`);
        try {
          await fsStat(p);
          return p;
        } catch {
          continue;
        }
      }
    } catch {
      // projects dir not readable
    }
    return null;
  }
}

function hasToolResultBlock(content: unknown[]): boolean {
  return content.some((b) => (b as { type?: string })?.type === "tool_result");
}

function isToolResultMessage(msg: Record<string, unknown>): boolean {
  const message = msg.message as { content?: unknown[] } | undefined;
  if (Array.isArray(message?.content) && hasToolResultBlock(message.content)) return true;
  if (Array.isArray(msg.content) && hasToolResultBlock(msg.content as unknown[])) return true;
  return false;
}

function isUserMessage(msg: Record<string, unknown>): boolean {
  return msg.type === "user" || msg.role === "user";
}

function startJsonlTailer(
  filePath: string,
  onToolResult: (parsed: Record<string, unknown>) => void,
): () => void {
  let offset = 0;
  let remainder = "";
  let closed = false;

  async function flush() {
    if (closed) return;
    try {
      const s = await fsStat(filePath);
      if (s.size <= offset) return;

      const fh = await fsOpen(filePath, "r");
      try {
        const buf = Buffer.alloc(s.size - offset);
        const { bytesRead } = await fh.read(buf, 0, buf.length, offset);
        offset = s.size;

        const raw = remainder + buf.subarray(0, bytesRead).toString("utf-8");
        const parts = raw.split("\n");
        remainder = parts.pop() ?? "";

        for (const line of parts) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line) as Record<string, unknown>;
            if (isUserMessage(parsed) && isToolResultMessage(parsed)) {
              onToolResult(parsed);
            }
          } catch {
            // skip malformed lines
          }
        }
      } finally {
        await fh.close();
      }
    } catch {
      // file temporarily unavailable during writes
    }
  }

  let watcher: FSWatcher | null = null;
  try {
    watcher = watch(filePath, () => {
      if (!closed) flush();
    });
    watcher.on("error", () => {});
  } catch {
    // file may not exist yet
  }

  const poll = setInterval(() => {
    if (!closed) flush();
  }, 500);

  return () => {
    closed = true;
    watcher?.close();
    clearInterval(poll);
  };
}

async function runOneTurn(
  correlationId: string,
  prompt: string,
  cwd: string,
  model: string,
  effort: string,
  resume?: string,
): Promise<void> {
  const mainWindow = getMainWindow();
  if (!mainWindow) return;

  const hookSettings = JSON.stringify({
    hooks: {
      PreToolUse: [
        {
          matcher: ".*",
          hooks: [
            {
              type: "http",
              url: `http://127.0.0.1:${getApprovalServerPort()}/approve`,
              timeout: 3600,
            },
          ],
        },
      ],
    },
  });

  const args: string[] = [
    "-p",
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    "--verbose",
    "--model",
    model,
    "--effort",
    effort,
    "--settings",
    hookSettings,
  ];
  if (resume) args.push("--resume", resume);

  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.ANTHROPIC_API_KEY;

  const child = spawn("claude", args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
  const ctx: ProcessContext = { process: child, sessionId: resume ?? null, cwd, model, effort };
  activeSessions.set(correlationId, ctx);

  const msg = JSON.stringify({
    type: "user",
    message: { role: "user", content: [{ type: "text", text: prompt }] },
  });
  child.stdin!.write(msg + "\n");
  child.stdin!.end();

  const rl = createInterface({ input: child.stdout! });
  rl.on("line", (line) => {
    if (!line.trim()) return;
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      if (
        parsed.type === "system" &&
        parsed.subtype === "init" &&
        typeof parsed.session_id === "string"
      ) {
        ctx.sessionId = parsed.session_id;
        (async () => {
          const delayMs = 500;
          while (activeSessions.has(correlationId)) {
            if (ctx.stopTailing) return;
            const fp = await findSessionJsonlPath(parsed.session_id as string, cwd);
            if (fp) {
              if (!activeSessions.has(correlationId) || ctx.stopTailing) return;
              ctx.stopTailing = startJsonlTailer(fp, (msg) => {
                mainWindow.webContents.send("claude:message", {
                  ...msg,
                  correlationId,
                });
              });
              return;
            }
            if (!activeSessions.has(correlationId)) return;
            await new Promise<void>((r) => setTimeout(r, delayMs));
          }
        })();
      }
      mainWindow.webContents.send("claude:message", { ...parsed, correlationId });
    } catch {
      // ignore non-JSON stdout lines
    }
  });

  let stderr = "";
  child.stderr!.on("data", (data: Buffer) => {
    const chunk = data.toString();
    stderr += chunk;
    log.debug({ stderr: chunk.trim() }, "claude stderr");
  });

  return new Promise<void>((resolve, reject) => {
    child.on("close", (code) => {
      ctx.stopTailing?.();
      const sessionId = ctx.sessionId;
      activeSessions.delete(correlationId);
      rl.close();
      mainWindow.webContents.send("claude:done", { correlationId, sessionId });
      const wasKilled = code === null || code === 143 || code === 137;
      if (code === 0 || wasKilled) {
        resolve();
      } else {
        const message = stderr.trim() || `claude exited with code ${code}`;
        mainWindow.webContents.send("claude:error", { message, correlationId });
        reject(new Error(message));
      }
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      ctx.stopTailing?.();
      activeSessions.delete(correlationId);
      rl.close();
      const message =
        err.code === "ENOENT"
          ? "Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code"
          : `Failed to start Claude: ${err.message}`;
      mainWindow.webContents.send("claude:error", { message, correlationId });
      mainWindow.webContents.send("claude:done", { correlationId, sessionId: null });
      reject(new Error(message));
    });
  });
}

export const claudeService = {
  async startSession(
    prompt: string,
    options: Record<string, unknown>,
  ): Promise<void> {
    const cwd = (options.cwd as string) ?? process.cwd();
    const model = (options.model as string) ?? "sonnet";
    const effort = (options.effort as string) ?? "high";
    const resume = options.resume as string | undefined;
    const correlationId = (options.correlationId as string) ?? crypto.randomUUID();

    log.info({ cwd, model, effort, correlationId }, "starting claude session");

    try {
      await runOneTurn(correlationId, prompt, cwd, model, effort, resume);
      log.info({ cwd, correlationId }, "claude session completed");
    } catch (error: unknown) {
      if (error instanceof Error) {
        log.error({ cwd, correlationId, err: error.message }, "claude session error");
      }
    }
  },

  async cancelSession(options?: Record<string, unknown>): Promise<void> {
    const sessionId = options?.sessionId as string | undefined;

    if (sessionId) {
      // Cancel the specific session matching this sessionId
      for (const [correlationId, ctx] of activeSessions) {
        if (ctx.sessionId === sessionId) {
          log.info({ correlationId, sessionId }, "cancelling claude session");
          ctx.process.kill("SIGTERM");
          activeSessions.delete(correlationId);
          return;
        }
      }
    } else {
      // Cancel all active sessions
      for (const [correlationId, ctx] of activeSessions) {
        log.info({ correlationId }, "cancelling claude session");
        ctx.process.kill("SIGTERM");
      }
      activeSessions.clear();
    }
  },

  async setModel(_model: string): Promise<void> {},

  async getModels(): Promise<unknown[]> {
    return [];
  },

  async getUsageStats(): Promise<{
    totalSessions: number;
    totalMessages: number;
    firstSessionDate: string | null;
    dailyActivity: Array<{ date: string; messageCount: number; sessionCount: number; toolCallCount: number }>;
    modelUsage: Record<string, { inputTokens: number; outputTokens: number; costUSD: number }>;
  }> {
    const statsPath = join(homedir(), ".claude", "stats-cache.json");
    try {
      const { readFile } = await import("fs/promises");
      const raw = await readFile(statsPath, "utf-8");
      const data = JSON.parse(raw) as Record<string, unknown>;
      return {
        totalSessions: typeof data.totalSessions === "number" ? data.totalSessions : 0,
        totalMessages: typeof data.totalMessages === "number" ? data.totalMessages : 0,
        firstSessionDate: typeof data.firstSessionDate === "string" ? data.firstSessionDate : null,
        dailyActivity: Array.isArray(data.dailyActivity)
          ? (data.dailyActivity as Array<Record<string, unknown>>).map((d) => ({
              date: String(d.date ?? ""),
              messageCount: typeof d.messageCount === "number" ? d.messageCount : 0,
              sessionCount: typeof d.sessionCount === "number" ? d.sessionCount : 0,
              toolCallCount: typeof d.toolCallCount === "number" ? d.toolCallCount : 0,
            }))
          : [],
        modelUsage: typeof data.modelUsage === "object" && data.modelUsage !== null
          ? Object.fromEntries(
              Object.entries(data.modelUsage as Record<string, Record<string, unknown>>).map(([model, u]) => [
                model,
                {
                  inputTokens: typeof u.inputTokens === "number" ? u.inputTokens : 0,
                  outputTokens: typeof u.outputTokens === "number" ? u.outputTokens : 0,
                  costUSD: typeof u.costUSD === "number" ? u.costUSD : 0,
                },
              ]),
            )
          : {},
      };
    } catch {
      return { totalSessions: 0, totalMessages: 0, firstSessionDate: null, dailyActivity: [], modelUsage: {} };
    }
  },

  getAuthStatus(): Promise<{
    loggedIn: boolean;
    authMethod?: string;
    subscriptionType?: string;
    email?: string;
  }> {
    return new Promise((resolve) => {
      execFile("claude", ["auth", "status"], { timeout: 5000 }, (err, stdout) => {
        if (err) {
          resolve({ loggedIn: false });
          return;
        }
        try {
          const data = JSON.parse(stdout.trim()) as Record<string, unknown>;
          resolve({
            loggedIn: data.loggedIn === true,
            authMethod: typeof data.authMethod === "string" ? data.authMethod : undefined,
            subscriptionType: typeof data.subscriptionType === "string" ? data.subscriptionType : undefined,
            email: typeof data.email === "string" ? data.email : undefined,
          });
        } catch {
          resolve({ loggedIn: false });
        }
      });
    });
  },
};
