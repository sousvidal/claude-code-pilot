import type { FileTreeNode } from "../../shared/types";

export function useFilesService() {
  return {
    readDir: (dirPath: string): Promise<FileTreeNode[]> =>
      window.api.files.readDir(dirPath),
    readFile: (filePath: string): Promise<string> =>
      window.api.files.readFile(filePath),
  };
}
