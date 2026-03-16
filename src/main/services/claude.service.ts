import { spawn } from "child_process";
import type { ChildProcess } from "child_process";
import { createInterface } from "readline";
import { getMainWindow } from "../index";
import { getApprovalServerPort } from "./approval.service";
import { logger } from "../lib/logger";

const log = logger.child({ service: "claude" });

interface ProcessContext {
  process: ChildProcess;
  sessionId: string | null;
  cwd: string;
  model: string;
  effort: string;
}

// Active processes keyed by correlationId
const activeSessions = new Map<string, ProcessContext>();

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
};
