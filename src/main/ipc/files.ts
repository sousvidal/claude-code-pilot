import { ipcMain } from "electron";
import { fileService } from "../services/file.service";

export function registerFileHandlers(): void {
  ipcMain.handle("files:readDir", (_event, dirPath: string) =>
    fileService.readDir(dirPath),
  );

  ipcMain.handle("files:readFile", (_event, filePath: string) =>
    fileService.readFile(filePath),
  );

  ipcMain.handle("files:writeFile", (_event, filePath: string, content: string) =>
    fileService.writeFile(filePath, content),
  );
}
