import { spawn } from "child_process";
import type { ChildProcess } from "child_process";
import { createInterface } from "readline";
import { getMainWindow } from "../index";
import { getApprovalServerPort } from "./approval.service";
import { logger } from "../lib/logger";

const log = logger.child({ service: "claude" });

let activeProcess: ChildProcess | null = null;
let currentSessionId: string | null = null;
let savedCwd: string = process.cwd();
let savedModel: string = "sonnet";
let savedEffort: string = "high";

async function runOneTurn(
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
  // Remove vars that interfere with Claude Code's own auth.
  // When launched as a GUI app these are never inherited; in dev mode they bleed
  // in from the terminal. Explicitly clearing them replicates the clean GUI env.
  delete env.CLAUDECODE;
  delete env.ANTHROPIC_API_KEY;

  const child = spawn("claude", args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
  activeProcess = child;

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
        currentSessionId = parsed.session_id;
      }
      mainWindow.webContents.send("claude:message", parsed);
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
      if (activeProcess === child) activeProcess = null;
      rl.close();
      mainWindow.webContents.send("claude:done");
      const wasKilled = code === null || code === 143 || code === 137;
      if (code === 0 || wasKilled) {
        resolve();
      } else {
        const message = stderr.trim() || `claude exited with code ${code}`;
        mainWindow.webContents.send("claude:error", { message });
        reject(new Error(message));
      }
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (activeProcess === child) activeProcess = null;
      rl.close();
      const message =
        err.code === "ENOENT"
          ? "Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code"
          : `Failed to start Claude: ${err.message}`;
      mainWindow.webContents.send("claude:error", { message });
      mainWindow.webContents.send("claude:done");
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

    log.info({ cwd, model, effort }, "starting new claude session");

    savedCwd = cwd;
    savedModel = model;
    savedEffort = effort;
    if (resume) currentSessionId = resume;

    try {
      await runOneTurn(prompt, cwd, model, effort, resume);
      log.info({ cwd }, "claude session completed");
    } catch (error: unknown) {
      if (error instanceof Error) {
        log.error({ cwd, err: error.message }, "claude session error");
      }
    }
  },

  async sendMessage(message: string): Promise<void> {
    try {
      await runOneTurn(
        message,
        savedCwd,
        savedModel,
        savedEffort,
        currentSessionId ?? undefined,
      );
      log.info({ cwd: savedCwd }, "claude turn completed");
    } catch (error: unknown) {
      if (error instanceof Error) {
        log.error({ err: error.message }, "claude turn error");
      }
    }
  },

  async cancelSession(): Promise<void> {
    if (activeProcess) {
      log.info("cancelling active claude session");
      activeProcess.kill("SIGTERM");
      activeProcess = null;
    }
    currentSessionId = null;
  },

  async setModel(_model: string): Promise<void> {},

  async getModels(): Promise<unknown[]> {
    return [];
  },
};
