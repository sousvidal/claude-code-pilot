import { readFile, readdir, stat, open } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { logger } from "../lib/logger";

const log = logger.child({ service: "session" });

const PROJECTS_DIR = join(homedir(), ".claude", "projects");

export interface SessionInfo {
  sessionId: string;
  cwd: string;
  lastModified: number;
  gitBranch?: string;
  summary?: string;
  firstPrompt?: string;
}

export interface ProjectGroup {
  path: string;
  displayName: string;
  sessions: SessionInfo[];
}

async function readSessionMeta(filePath: string): Promise<SessionInfo | null> {
  let lines: string[];
  let mtimeMs: number;

  try {
    const fileStat = await stat(filePath);
    mtimeMs = fileStat.mtimeMs;

    if (fileStat.size > 65536) {
      const fh = await open(filePath, "r");
      try {
        const buf = Buffer.alloc(32768);
        const { bytesRead } = await fh.read(buf, 0, 32768, 0);
        const text = buf.subarray(0, bytesRead).toString("utf-8");
        const lastNewline = text.lastIndexOf("\n");
        lines = (lastNewline > 0 ? text.slice(0, lastNewline) : text)
          .split("\n")
          .filter(Boolean);
      } finally {
        await fh.close();
      }
    } else {
      const content = await readFile(filePath, "utf-8");
      lines = content.split("\n").filter(Boolean);
    }
  } catch {
    return null;
  }

  let sessionId = "";
  let cwd = "";
  let gitBranch = "";
  let firstPrompt = "";
  let lastPrompt = "";

  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      if (obj.sessionId && !sessionId) sessionId = obj.sessionId as string;
      if (obj.cwd && !cwd) cwd = obj.cwd as string;
      if (obj.gitBranch && !gitBranch) gitBranch = obj.gitBranch as string;

      if (obj.type === "user" && !obj.isMeta) {
        const content = (obj.message as Record<string, unknown> | undefined)?.content;
        let text = "";
        if (typeof content === "string") {
          text = content.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, "").trim();
        } else if (Array.isArray(content)) {
          for (const block of content as Record<string, unknown>[]) {
            if (block.type === "text" && typeof block.text === "string") {
              text = (block.text as string).replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, "").trim();
              if (text) break;
            }
          }
        }
        if (text && text.length > 5) {
          if (!firstPrompt) firstPrompt = text.slice(0, 120);
          lastPrompt = text.slice(0, 120);
        }
      }
    } catch {
      // skip malformed lines
    }
  }

  if (!sessionId) return null;

  return {
    sessionId,
    cwd: cwd || "unknown",
    lastModified: mtimeMs,
    gitBranch: gitBranch || undefined,
    summary: lastPrompt || firstPrompt || undefined,
    firstPrompt: firstPrompt || undefined,
  };
}

export const sessionService = {
  async listSessions(dir?: string): Promise<SessionInfo[]> {
    log.debug({ dir }, "listing sessions");

    let projectDirs: string[];
    try {
      const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
      projectDirs = entries
        .filter((e) => e.isDirectory() && e.name !== "memory")
        .map((e) => join(PROJECTS_DIR, e.name));
    } catch {
      log.warn("could not read projects directory");
      return [];
    }

    const nested = await Promise.all(
      projectDirs.map(async (projectDir) => {
        try {
          const files = await readdir(projectDir);
          const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));
          const statResults = await Promise.all(
            jsonlFiles.map(async (f) => {
              const filePath = join(projectDir, f);
              try {
                const s = await stat(filePath);
                return { path: filePath, mtimeMs: s.mtimeMs };
              } catch {
                return null;
              }
            }),
          );
          return statResults.filter(
            (r): r is { path: string; mtimeMs: number } => r !== null,
          );
        } catch {
          return [];
        }
      }),
    );

    const allFiles = nested.flat();
    allFiles.sort((a, b) => b.mtimeMs - a.mtimeMs);

    const results: SessionInfo[] = [];
    for (const file of allFiles) {
      const meta = await readSessionMeta(file.path);
      if (!meta) continue;
      if (dir && meta.cwd !== dir) continue;
      results.push(meta);
    }

    log.info({ count: results.length, dir }, "sessions listed");
    return results;
  },

  async getMessages(sessionId: string, dir?: string): Promise<unknown[]> {
    log.info({ sessionId, dir }, "loading messages for session");

    let jsonlPath: string | undefined;

    if (dir) {
      const projectSlug = dir.replace(/[/_]/g, "-");
      const candidate = join(PROJECTS_DIR, projectSlug, `${sessionId}.jsonl`);
      try {
        await stat(candidate);
        jsonlPath = candidate;
      } catch {
        // fall through to search
      }
    }

    if (!jsonlPath) {
      try {
        const projectDirs = await readdir(PROJECTS_DIR, { withFileTypes: true });
        for (const entry of projectDirs) {
          if (!entry.isDirectory()) continue;
          const candidate = join(PROJECTS_DIR, entry.name, `${sessionId}.jsonl`);
          try {
            await stat(candidate);
            jsonlPath = candidate;
            break;
          } catch {
            // not here, keep searching
          }
        }
      } catch {
        // projects dir not readable
      }
    }

    if (!jsonlPath) {
      log.warn({ sessionId }, "could not find session JSONL file");
      return [];
    }

    let content: string;
    try {
      content = await readFile(jsonlPath, "utf-8");
    } catch (err) {
      log.warn({ jsonlPath, err }, "could not read session JSONL");
      return [];
    }

    const messages: unknown[] = [];
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line) as { type?: string };
        if (msg.type === "user" || msg.type === "assistant") {
          messages.push(msg);
        }
      } catch {
        // skip malformed lines
      }
    }

    log.info({ sessionId, messageCount: messages.length }, "session messages loaded");
    return messages;
  },

  async getSubagentMessages(
    sessionId: string,
    toolUseId: string,
    dir?: string,
  ): Promise<unknown[]> {
    if (!dir) {
      log.warn({ sessionId, toolUseId }, "getSubagentMessages requires dir");
      return [];
    }
    const projectSlug = dir.replace(/[/_]/g, "-");
    const baseDir = join(PROJECTS_DIR, projectSlug);
    const jsonlPath = join(baseDir, `${sessionId}.jsonl`);
    const subagentsDir = join(baseDir, sessionId, "subagents");

    log.info({ sessionId, toolUseId, jsonlPath }, "loading subagent messages");

    // Step 1: Find the promptId for this toolUseId in the parent JSONL.
    let promptId: string | undefined;
    let parentContent: string;
    try {
      parentContent = await readFile(jsonlPath, "utf8");
    } catch (err) {
      log.warn({ jsonlPath, err }, "could not read session JSONL for subagent messages");
      return [];
    }

    for (const line of parentContent.split("\n")) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line) as {
          type?: string;
          promptId?: string;
          message?: { content?: { type?: string; tool_use_id?: string }[] };
        };
        if (
          obj.type === "user" &&
          typeof obj.promptId === "string" &&
          Array.isArray(obj.message?.content) &&
          obj.message.content.some(
            (c) => c.type === "tool_result" && c.tool_use_id === toolUseId,
          )
        ) {
          promptId = obj.promptId;
          break;
        }
      } catch {
        // skip malformed lines
      }
    }

    if (!promptId) {
      log.warn({ sessionId, toolUseId }, "could not find promptId for toolUseId in parent JSONL");
      return [];
    }

    // Step 2: Find the subagent JSONL file whose first message has the matching promptId.
    let subagentFiles: string[];
    try {
      const entries = await readdir(subagentsDir);
      subagentFiles = entries.filter((f) => f.endsWith(".jsonl"));
    } catch {
      log.warn({ subagentsDir }, "could not read subagents directory");
      return [];
    }

    for (const file of subagentFiles) {
      const filePath = join(subagentsDir, file);
      let fileContent: string;
      try {
        fileContent = await readFile(filePath, "utf8");
      } catch {
        continue;
      }

      const firstLine = fileContent.split("\n").find((l) => l.trim());
      if (!firstLine) continue;
      try {
        const first = JSON.parse(firstLine) as { promptId?: string };
        if (first.promptId !== promptId) continue;
      } catch {
        continue;
      }

      // Found the matching subagent file — return all its user/assistant messages.
      const messages: unknown[] = [];
      for (const line of fileContent.split("\n")) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line) as { type?: string };
          if (msg.type === "user" || msg.type === "assistant") {
            messages.push(msg);
          }
        } catch {
          // skip malformed lines
        }
      }
      log.info({ sessionId, toolUseId, file, messageCount: messages.length }, "subagent messages loaded");
      return messages;
    }

    log.warn({ sessionId, toolUseId, promptId }, "no matching subagent file found");
    return [];
  },

  groupByProject(sessions: SessionInfo[]): ProjectGroup[] {
    const groups = new Map<string, SessionInfo[]>();

    for (const session of sessions) {
      const cwd = session.cwd ?? "unknown";
      const existing = groups.get(cwd) ?? [];
      existing.push(session);
      groups.set(cwd, existing);
    }

    return Array.from(groups.entries()).map(([path, groupSessions]) => ({
      path,
      displayName: path.split("/").pop() ?? path,
      sessions: groupSessions.sort((a, b) => b.lastModified - a.lastModified),
    }));
  },
};
