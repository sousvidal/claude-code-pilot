import { execFile } from "child_process";
import * as path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const gitService = {
  async getFileAtHead(filePath: string): Promise<string | null> {
    if (!path.isAbsolute(filePath)) return null;
    try {
      const dir = path.dirname(filePath);
      const { stdout: root } = await execFileAsync("git", ["-C", dir, "rev-parse", "--show-toplevel"]);
      const gitRoot = root.trim();
      const relativePath = path.relative(gitRoot, filePath);
      if (relativePath.startsWith("..")) return null;
      const { stdout } = await execFileAsync("git", ["-C", gitRoot, "show", `HEAD:${relativePath}`]);
      return stdout;
    } catch {
      return null;
    }
  },
};
