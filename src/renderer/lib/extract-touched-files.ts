import type { Turn, TouchedFile, FileOperation } from "../../shared/types";

function extractPathFromBashCommand(command: string): { path: string; operation: "deleted" } | null {
  const match = command.match(/\brm\s+(?:-[a-zA-Z]+\s+)*["']?([^\s"';&|]+)["']?/);
  if (match && !match[1].startsWith("-")) {
    return { path: match[1], operation: "deleted" };
  }
  return null;
}

export function extractTouchedFiles(turns: Turn[]): TouchedFile[] {
  const seen = new Map<string, FileOperation>();

  for (const turn of turns) {
    for (const block of turn.assistantBlocks) {
      if (block.type !== "tool_use") continue;

      const { name, input } = block;

      if (name === "Write" || name === "Edit") {
        const path = typeof input.file_path === "string" ? input.file_path : null;
        if (!path) continue;
        const operation: FileOperation = name === "Write" && !seen.has(path) ? "created" : "modified";
        seen.set(path, operation);
      } else if (name === "Bash") {
        const command = typeof input.command === "string" ? input.command : null;
        if (!command) continue;
        const result = extractPathFromBashCommand(command);
        if (result) {
          seen.set(result.path, result.operation);
        }
      }
    }
  }

  return Array.from(seen.entries()).map(([path, operation]) => ({ path, operation }));
}
