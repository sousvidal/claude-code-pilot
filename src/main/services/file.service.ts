import { readdir, readFile, stat, writeFile } from "fs/promises";
import { join, extname } from "path";
import type { FileTreeNode } from "../../shared/types";

const IGNORED_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  ".cache",
  "dist",
  "out",
  "build",
  ".DS_Store",
  "thumbs.db",
]);

export const fileService = {
  async readDir(dirPath: string): Promise<FileTreeNode[]> {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const nodes: FileTreeNode[] = [];

    for (const entry of entries) {
      if (IGNORED_NAMES.has(entry.name)) continue;
      if (entry.name.startsWith(".") && entry.name !== ".gitignore") continue;

      const fullPath = join(dirPath, entry.name);
      const isDirectory = entry.isDirectory();

      nodes.push({
        name: entry.name,
        path: fullPath,
        isDirectory,
        extension: isDirectory ? undefined : extname(entry.name),
      });
    }

    return nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  },

  async readFile(filePath: string): Promise<string> {
    const info = await stat(filePath);
    if (info.size > 1024 * 512) {
      return "[File too large to preview]";
    }
    const content = await readFile(filePath, "utf-8");
    return content;
  },

  async writeFile(filePath: string, content: string): Promise<void> {
    await writeFile(filePath, content, "utf-8");
  },
};
