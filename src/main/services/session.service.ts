import { readFile } from "fs/promises";
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
    const projectSlug = dir.replace(/\//g, "-");
    const jsonlPath = join(homedir(), ".claude", "projects", projectSlug, `${sessionId}.jsonl`);

    log.info({ sessionId, toolUseId, jsonlPath }, "loading subagent messages");

    let content: string;
    try {
      content = await readFile(jsonlPath, "utf8");
    } catch (err) {
      log.warn({ jsonlPath, err }, "could not read session JSONL for subagent messages");
      return [];
    }

    const messages: unknown[] = [];
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line) as {
          type?: string;
          parentToolUseID?: string;
          data?: { type?: string; agentId?: string; message?: unknown };
        };
        if (
          obj.type === "progress" &&
          obj.parentToolUseID === toolUseId &&
          obj.data?.type === "agent_progress" &&
          obj.data.message != null
        ) {
          messages.push(obj.data.message);
        }
      } catch {
        // skip malformed lines
      }
    }

    log.info({ sessionId, toolUseId, messageCount: messages.length }, "subagent messages loaded");
    return messages;
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
