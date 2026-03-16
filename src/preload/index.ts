import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("api", {
  sessions: {
    list: (dir?: string) => ipcRenderer.invoke("sessions:list", dir),
    getMessages: (sessionId: string, dir?: string) =>
      ipcRenderer.invoke("sessions:getMessages", sessionId, dir),
    getSubagentMessages: (sessionId: string, toolUseId: string, dir?: string) =>
      ipcRenderer.invoke("sessions:getSubagentMessages", sessionId, toolUseId, dir),
  },
  claude: {
    start: (prompt: string, options: Record<string, unknown>) =>
      ipcRenderer.invoke("claude:start", prompt, options),
    send: (message: string) => ipcRenderer.invoke("claude:send", message),
    cancel: () => ipcRenderer.invoke("claude:cancel"),
    setModel: (model: string) => ipcRenderer.invoke("claude:setModel", model),
    models: () => ipcRenderer.invoke("claude:models"),
    onMessage: (callback: (message: unknown) => void) => {
      const handler = (_event: IpcRendererEvent, message: unknown) =>
        callback(message);
      ipcRenderer.on("claude:message", handler);
      return () => ipcRenderer.removeListener("claude:message", handler);
    },
    onError: (callback: (error: unknown) => void) => {
      const handler = (_event: IpcRendererEvent, error: unknown) =>
        callback(error);
      ipcRenderer.on("claude:error", handler);
      return () => ipcRenderer.removeListener("claude:error", handler);
    },
    onDone: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on("claude:done", handler);
      return () => ipcRenderer.removeListener("claude:done", handler);
    },
  },
  files: {
    readDir: (dirPath: string) => ipcRenderer.invoke("files:readDir", dirPath),
    readFile: (filePath: string) =>
      ipcRenderer.invoke("files:readFile", filePath),
  },
  dialog: {
    openDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
  },
});
