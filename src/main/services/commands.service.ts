import fs from "fs";
import path from "path";
import os from "os";
import type { SlashCommand } from "../../shared/types";

const BUILTIN_COMMANDS: SlashCommand[] = [
  { name: "bug", description: "Report a bug to Anthropic", source: "builtin" },
  { name: "clear", description: "Clear conversation history", source: "builtin" },
  { name: "compact", description: "Compact conversation with optional focus area", source: "builtin" },
  { name: "cost", description: "Show token usage and cost for this session", source: "builtin" },
  { name: "doctor", description: "Check the health of your Claude Code installation", source: "builtin" },
  { name: "exit", description: "Exit Claude Code", source: "builtin" },
  { name: "help", description: "Get help with Claude Code commands", source: "builtin" },
  { name: "init", description: "Initialize a new project with a CLAUDE.md file", source: "builtin" },
  { name: "login", description: "Switch Anthropic accounts", source: "builtin" },
  { name: "logout", description: "Sign out from your Anthropic account", source: "builtin" },
  { name: "memory", description: "Edit Claude's memory files", source: "builtin" },
  { name: "pr_comments", description: "View comments on current pull request", source: "builtin" },
  { name: "release-notes", description: "View release notes for Claude Code", source: "builtin" },
  { name: "review", description: "Request a code review", source: "builtin" },
  { name: "status", description: "Show your account and subscription status", source: "builtin" },
  { name: "terminal-setup", description: "Set up terminal integration", source: "builtin" },
  { name: "vim", description: "Enter vim mode", source: "builtin" },
];

function readCommandsFromDir(dir: string, source: SlashCommand["source"]): SlashCommand[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => {
        const name = e.name.slice(0, -3);
        const filePath = path.join(dir, e.name);
        const description = extractDescription(filePath);
        return { name, description, source };
      });
  } catch {
    return [];
  }
}

function extractDescription(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const firstLine = content.split("\n").find((line) => line.trim().length > 0) ?? "";
    return firstLine.replace(/^#+\s*/, "").trim();
  } catch {
    return "";
  }
}

export const commandsService = {
  list(projectPath?: string): SlashCommand[] {
    const globalDir = path.join(os.homedir(), ".claude", "commands");
    const userCommands = readCommandsFromDir(globalDir, "user");

    const projectCommands = projectPath
      ? readCommandsFromDir(path.join(projectPath, ".claude", "commands"), "project")
      : [];

    // Built-ins first, then user, then project — project overrides by name
    const byName = new Map<string, SlashCommand>();
    for (const cmd of [...BUILTIN_COMMANDS, ...userCommands, ...projectCommands]) {
      byName.set(cmd.name, cmd);
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  },
};
