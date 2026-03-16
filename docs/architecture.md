# Architecture Overview

Clay is a desktop application built on Electron. It wraps the `claude` CLI with a rich GUI, providing session management, real-time streaming, tool permission management, file exploration, and conversation history.

---

## Process Model

Electron runs two separate OS processes. Clay respects this boundary strictly.

```
┌─────────────────────────────────────────────────────────────┐
│  Main Process (Node.js)                                     │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ claudeService│  │sessionService│  │  approvalService  │  │
│  │  (spawns CLI)│  │ (reads JSONL)│  │  (HTTP server)    │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                   │             │
│         └─────────────────┴───────────────────┘             │
│                           │ IPC                             │
└───────────────────────────┼─────────────────────────────────┘
                            │ contextBridge (preload)
┌───────────────────────────┼─────────────────────────────────┐
│  Renderer Process (React) │                                 │
│                           │                                 │
│  ┌────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │liveSession │  │  sessionsStore  │  │    editorStore   │  │
│  │  (Zustand) │  │   (Zustand)     │  │    (Zustand)     │  │
│  └────────────┘  └─────────────────┘  └──────────────────┘  │
│                                                             │
│           React components / TanStack Query                 │
└─────────────────────────────────────────────────────────────┘
```

### Main process (`src/main/`)

Runs in Node.js with full system access. Responsibilities:

- Creating and managing the `BrowserWindow`
- Spawning the `claude` CLI as a child process
- Reading and parsing JSONL session files from disk
- Running the local HTTP approval server for tool permission hooks
- Registering all `ipcMain` handlers
- Persisting settings via `electron-store`

### Renderer process (`src/renderer/`)

Runs in a sandboxed Chromium context — treated as a browser. Responsibilities:

- All React UI, routing, and user interaction
- State management via Zustand stores
- Calling main-process operations via `window.api` (the preload bridge)

### Preload (`src/preload/index.ts`)

The narrow bridge between the two processes. Uses `contextBridge.exposeInMainWorld` to expose a typed `window.api` surface. Contains no business logic — only wires `ipcRenderer.invoke` / `ipcRenderer.on` to named methods.

---

## IPC Communication

All renderer ↔ main communication flows through typed IPC channels. The pattern:

```
Renderer                  Preload             Main
─────────                 ───────             ────
window.api.foo()   →   ipcRenderer.invoke  →  ipcMain.handle
                   ←   Promise resolves    ←
```

Push events (streaming messages, permission requests) flow in the opposite direction via `ipcRenderer.on`:

```
Main                      Preload             Renderer
────                      ───────             ────────
mainWindow.webContents    ipcRenderer.on   →  callback registered
  .send("channel", data)                      via window.api.*.onXxx()
```

See [ipc-api.md](./ipc-api.md) for the full channel reference.

---

## Key Services

### `claudeService` (`src/main/services/claude.service.ts`)

Manages the lifecycle of `claude` CLI child processes.

- Spawns `claude` with `--output-format stream-json` and injects a `--settings` JSON blob that points the `PreToolUse` hook at the local approval server.
- Each run is tracked by a `correlationId` (a UUID generated by the renderer and passed through `claude:start`). This allows the renderer to match streaming messages back to the originating chat view before a real `sessionId` is known.
- Reads stdout line-by-line and forwards each parsed JSONL message to the renderer via `claude:message`.
- On close, emits `claude:done` with the final `sessionId` (extracted from the `system:init` message).
- Deletes `CLAUDECODE` and `ANTHROPIC_API_KEY` from the child environment so they don't override user settings.
- On macOS, the main process resolves the user's full `PATH` by spawning a login shell before the app starts, ensuring `claude` is found even when installed via a version manager like `nvm` or `mise`.

### `sessionService` (`src/main/services/session.service.ts`)

Reads and parses Claude's JSONL session files from `~/.claude/projects/`.

- `listSessions()` walks all project subdirectories, reads the first ~32 KB of each `.jsonl` file to extract metadata cheaply (sessionId, cwd, git branch, first/last user prompt), and returns sessions sorted by modification time.
- `getMessages()` loads the full JSONL file for a session, filtering to `user` and `assistant` type lines only.
- `getSubagentMessages()` finds the subagent JSONL file that corresponds to a specific `toolUseId` by first looking up the `promptId` in the parent session file, then scanning the `subagents/` subdirectory for the matching file.

### `approvalService` (`src/main/services/approval.service.ts`)

Runs a local HTTP server (on a random port, bound to `127.0.0.1`) that receives `PreToolUse` hook calls from the `claude` CLI.

- If the tool is in the always-allowed list (persisted via `electron-store`), it immediately responds with `allow` and notifies the renderer via `permission:autoApproved`.
- Otherwise it suspends the HTTP request, sends a `permission:request` IPC event to the renderer, and awaits the user's decision (resolved via `permission:respond`).
- Unanswered requests time out after 1 hour and default to `allow`.

### `fileService` (`src/main/services/file.service.ts`)

Reads the filesystem for the file explorer. Filters out noisy directories (`node_modules`, `.git`, `dist`, etc.) and hidden files (except `.gitignore`). Files over 512 KB return a placeholder string instead of content.

---

## Renderer State

### `useLiveSessionStore` (`src/renderer/stores/liveSession.ts`)

Tracks all currently running `claude` processes. Keyed by `correlationId`.

| Field | Description |
|---|---|
| `runningSessions` | `Map<correlationId, SessionRunState>` — messages, sessionId, permission queue |
| `autoApprovedIds` | Tool use IDs that were auto-approved (for UI notification) |
| `unseenSessionIds` | Sessions that got new messages while the user was elsewhere |
| `currentModel` | The model selected in the chat input |

A `SessionRunState` holds the streaming messages for one run before they are persisted to disk. Once the run completes the renderer reloads the session from disk via TanStack Query.

### `useSessionsStore` (`src/renderer/stores/sessions.ts`)

Tracks UI navigation state: which session and project are currently active, scroll positions per session, and any pending new session being started.

### `useEditorStore` / `useUIStore`

Minimal stores for the file editor panel (active file path) and layout (sidebar collapse state).

---

## Data Flow: Starting a New Session

```
1. User types prompt → ChatInput submits
2. Renderer calls window.api.claude.start(prompt, { cwd, model, effort, correlationId })
3. Main: claudeService.startSession() spawns `claude` child process
4. CLI connects to approvalService HTTP server for PreToolUse hooks
5. CLI writes JSONL lines to stdout
6. Main: each line → mainWindow.webContents.send("claude:message", { ...parsed, correlationId })
7. Renderer: liveSessionStore.addMessageToRun(correlationId, message)
8. ChatView reads messages from the store and renders them in real time
9. On process close: main sends "claude:done" with the final sessionId
10. Renderer: TanStack Query invalidates "sessions" → session browser refreshes
```

## Data Flow: Loading Historical Session

```
1. User clicks a session in the session browser
2. Renderer calls window.api.sessions.getMessages(sessionId, dir)
3. Main: sessionService.getMessages() reads the JSONL file from disk
4. Returns parsed user/assistant message objects
5. Renderer: parse-turns.ts converts raw messages into structured Turn objects
6. ChatView renders the full Turn list
```

## Data Flow: Tool Permission

```
1. Claude CLI calls PreToolUse hook → POST /approve on the approval server
2. approvalService checks always-allowed list
   a. If allowed: responds immediately, sends permission:autoApproved to renderer
   b. If not: suspends request, sends permission:request to renderer
3. Renderer: liveSessionStore.enqueuePermission() adds it to the session's queue
4. ChatView renders the PermissionCard inline in the message stream
5. User clicks Allow or Deny
6. Renderer: window.api.permission.respond(id, decision)
7. Main: resolvePermission() resolves the pending HTTP request
8. approvalService sends the allow/deny response body back to the CLI
9. CLI continues or aborts the tool call
```

---

## Directory Structure

```
src/
├── main/
│   ├── index.ts                 # App entry: window, PATH resolution, startup
│   ├── lib/
│   │   └── logger.ts            # Pino logger instance
│   ├── ipc/
│   │   ├── index.ts             # registerAllHandlers()
│   │   ├── claude.ts            # claude:* + dialog:* handlers
│   │   ├── sessions.ts          # sessions:* handlers
│   │   ├── files.ts             # files:* handlers
│   │   └── permissions.ts       # permission:* handlers
│   └── services/
│       ├── claude.service.ts    # CLI process management
│       ├── session.service.ts   # JSONL file reading and parsing
│       ├── file.service.ts      # File system browsing
│       └── approval.service.ts  # HTTP approval server + electron-store
├── preload/
│   └── index.ts                 # contextBridge: exposes window.api
├── shared/
│   ├── api.d.ts                 # TypeScript: Window.api type declaration
│   └── types.ts                 # Shared domain types (Turn, ToolUseBlock, etc.)
└── renderer/
    ├── components/
    │   ├── ui/                  # Shadcn primitives
    │   ├── chat/                # ChatView, MessageStream, tool blocks, etc.
    │   ├── sessions/            # SessionBrowser, SessionItem, ProjectGroup
    │   ├── files/               # FileTreeNode, file explorer
    │   ├── editor/              # Monaco editor panel
    │   └── layouts/             # AppLayout (three-panel shell)
    ├── stores/
    │   ├── liveSession.ts       # Running session state
    │   ├── sessions.ts          # Active session / project navigation
    │   ├── editor.ts            # Open file state
    │   └── ui.ts                # Sidebar collapse state
    ├── lib/
    │   ├── parse-turns.ts       # Converts raw JSONL messages → Turn[]
    │   ├── chat-tools.ts        # Tool colour / icon / label mapping
    │   └── utils.ts             # cn() helper
    └── services/
        ├── claude.service.ts    # Renderer-side wrapper for window.api.claude
        ├── sessions.service.ts  # Renderer-side wrapper for window.api.sessions
        └── files.service.ts     # Renderer-side wrapper for window.api.files
```
