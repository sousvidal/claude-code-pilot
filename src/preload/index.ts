import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import type { AutoApprovedEvent, PermissionRequest } from "../shared/types";

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
    cancel: (sessionId?: string) =>
      ipcRenderer.invoke("claude:cancel", sessionId ? { sessionId } : undefined),
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
    onDone: (callback: (event: { correlationId: string; sessionId: string | null }) => void) => {
      const handler = (_event: IpcRendererEvent, doneEvent: { correlationId: string; sessionId: string | null }) =>
        callback(doneEvent);
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
  permission: {
    onRequest: (callback: (request: PermissionRequest) => void) => {
      const handler = (_event: IpcRendererEvent, request: PermissionRequest) =>
        callback(request);
      ipcRenderer.on("permission:request", handler);
      return () => ipcRenderer.removeListener("permission:request", handler);
    },
    onAutoApproved: (callback: (event: AutoApprovedEvent) => void) => {
      const handler = (
        _event: IpcRendererEvent,
        autoEvent: AutoApprovedEvent,
      ) => callback(autoEvent);
      ipcRenderer.on("permission:autoApproved", handler);
      return () =>
        ipcRenderer.removeListener("permission:autoApproved", handler);
    },
    respond: (id: string, decision: "allow" | "deny") => {
      ipcRenderer.send("permission:respond", id, decision);
    },
    alwaysAllow: (toolName: string) =>
      ipcRenderer.invoke("permission:alwaysAllow", toolName),
  },
});
