import { createServer } from "http";
import type { IncomingMessage, Server, ServerResponse } from "http";
import ElectronStore from "electron-store";
import { getMainWindow } from "../index";
import { logger } from "../lib/logger";

const log = logger.child({ service: "approval" });

interface StoreSchema {
  alwaysAllowedTools: string[];
}

// electron-store ships as ESM; when bundled to CJS the constructor is on .default
const StoreClass = (
  ElectronStore as unknown as { default: typeof ElectronStore }
).default ?? ElectronStore;
const store = new StoreClass<StoreSchema>({
  defaults: { alwaysAllowedTools: [] },
});

type Decision = "allow" | "deny";

interface PendingRequest {
  resolve: (decision: Decision) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pendingRequests = new Map<string, PendingRequest>();
let httpServer: Server | null = null;
let serverPort = 0;

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => {
      raw += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>);
      } catch {
        resolve({});
      }
    });
  });
}

function respondAllow(res: ServerResponse): void {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
      },
    }),
  );
}

function respondDeny(res: ServerResponse): void {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "User denied",
      },
    }),
  );
}

export async function startApprovalServer(): Promise<void> {
  httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST" || req.url !== "/approve") {
      res.writeHead(404);
      res.end();
      return;
    }

    const body = await readBody(req);
    const toolName = body.tool_name as string;
    const toolUseId = body.tool_use_id as string;
    const sessionId = body.session_id as string;
    const toolInput = (body.tool_input ?? {}) as Record<string, unknown>;

    log.debug({ toolName, toolUseId, sessionId }, "PreToolUse hook received");

    const alwaysAllowed = store.get("alwaysAllowedTools");
    if (alwaysAllowed.includes(toolName)) {
      log.debug({ toolName }, "auto-approved (always-allowed)");
      respondAllow(res);
      getMainWindow()?.webContents.send("permission:autoApproved", {
        toolName,
        toolUseId,
        sessionId,
        toolInput,
      });
      return;
    }

    const requestId = toolUseId || `${Date.now()}`;

    const decision = await new Promise<Decision>((resolve) => {
      const timer = setTimeout(() => {
        pendingRequests.delete(requestId);
        log.warn({ requestId, toolName }, "approval timed out — allowing");
        resolve("allow");
      }, 3_600_000);

      pendingRequests.set(requestId, { resolve, timer });

      getMainWindow()?.webContents.send("permission:request", {
        id: requestId,
        sessionId,
        toolName,
        toolUseId,
        toolInput,
      });
    });

    if (decision === "allow") {
      respondAllow(res);
    } else {
      respondDeny(res);
    }
  });

  await new Promise<void>((resolve, reject) => {
    httpServer!.listen(0, "127.0.0.1", () => resolve());
    httpServer!.once("error", reject);
  });

  serverPort = (httpServer.address() as { port: number }).port;
  log.info({ port: serverPort }, "approval server listening");
}

export function getApprovalServerPort(): number {
  return serverPort;
}

export function resolvePermission(requestId: string, decision: Decision): void {
  const pending = pendingRequests.get(requestId);
  if (!pending) {
    log.warn({ requestId }, "resolvePermission: no pending request found");
    return;
  }
  clearTimeout(pending.timer);
  pendingRequests.delete(requestId);
  pending.resolve(decision);
}

export function clearAlwaysAllowedTools(): void {
  store.set("alwaysAllowedTools", []);
  log.info("cleared always-allowed tools list (dev mode)");
}

export function addAlwaysAllowedTool(toolName: string): void {
  const current = store.get("alwaysAllowedTools");
  if (!current.includes(toolName)) {
    store.set("alwaysAllowedTools", [...current, toolName]);
    log.info({ toolName }, "added to always-allowed list");
  }
}

export function stopApprovalServer(): void {
  for (const [id, pending] of pendingRequests) {
    clearTimeout(pending.timer);
    pending.resolve("deny");
    pendingRequests.delete(id);
  }
  httpServer?.close();
  httpServer = null;
  serverPort = 0;
}
