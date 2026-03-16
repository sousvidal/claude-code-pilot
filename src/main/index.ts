import { app, BrowserWindow, shell } from "electron";
import { join } from "path";
import { execSync } from "child_process";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { registerAllHandlers } from "./ipc";
import { startApprovalServer } from "./services/approval.service";

// GUI apps on macOS don't inherit the user's shell PATH or environment.
// Spawn a login shell to pull in the real PATH so `claude` is found,
// and so terminal-only env vars (like a stale ANTHROPIC_API_KEY) don't bleed in.
try {
  const userShell = process.env.SHELL ?? "/bin/zsh";
  const realPath = execSync(`${userShell} -ilc 'echo -n "$PATH"'`, {
    encoding: "utf-8",
  });
  if (realPath) process.env.PATH = realPath;
} catch {
  // fall back to whatever PATH was inherited
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#111318",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.clay");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // if (is.dev) {
    // clearAlwaysAllowedTools();
  // }

  await startApprovalServer();
  registerAllHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
