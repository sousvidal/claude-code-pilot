import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { listSessions, getSessionMessages } from "@anthropic-ai/claude-agent-sdk";
import type { SDKSessionInfo, SessionMessage } from "@anthropic-ai/claude-agent-sdk";
import { logger } from "../lib/logger";

const log = logger.child({ service: "session" });

export interface ProjectGroup {
  path: string;
  displayName: string;
  sessions: SDKSessionInfo[];
}

export const sessionService = {
  async listSessions(dir?: string): Promise<SDKSessionInfo[]> {
    log.debug({ dir }, "listing sessions");
    const sessions = await listSessions(dir ? { dir } : undefined);
    log.info({ count: sessions.length, dir }, "sessions listed");
    return sessions;
  },

  async getMessages(
    sessionId: string,
    dir?: string,
  ): Promise<SessionMessage[]> {
    log.info({ sessionId, dir }, "loading messages for session");
    const messages = await getSessionMessages(sessionId, dir ? { dir } : undefined);
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
    const baseDir = join(homedir(), ".claude", "projects", projectSlug);
    const jsonlPath = join(baseDir, `${sessionId}.jsonl`);
    const subagentsDir = join(baseDir, sessionId, "subagents");

    log.info({ sessionId, toolUseId, jsonlPath }, "loading subagent messages");

    // Step 1: Find the promptId for this toolUseId in the parent JSONL.
    // The tool result user message in the parent shares a promptId with the
    // first message of the corresponding subagent JSONL file.
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

  groupByProject(sessions: SDKSessionInfo[]): ProjectGroup[] {
    const groups = new Map<string, SDKSessionInfo[]>();

    for (const session of sessions) {
      const cwd = session.cwd ?? "unknown";
      const existing = groups.get(cwd) ?? [];
      existing.push(session);
      groups.set(cwd, existing);
    }

    return Array.from(groups.entries()).map(([path, sessions]) => ({
      path,
      displayName: path.split("/").pop() ?? path,
      sessions: sessions.sort((a, b) => b.lastModified - a.lastModified),
    }));
  },
};
