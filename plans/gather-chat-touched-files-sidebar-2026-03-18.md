# Plan: Gather Chat-Touched Files Sidebar

_Started: 2026-03-18_
_Closed: 2026-03-18_

## Brief

Parse Claude's tool use events from the message stream to detect file operations (Write, Edit, delete via Bash, etc.) and store them persistently per session. Display the accumulated list of touched files in a collapsible sidebar on the right side of the chat view, styled like VS Code's git-changed-files panel (showing operation type: created / modified / deleted). No line diff counts for now. No click interaction for now.

**Acceptance criteria:**
- Tool use events in messages are scanned for file-affecting operations.
- The file list is derived from the already-persisted JSONL message history — no separate storage needed (messages are the source of truth; the list is rebuilt on load).
- The sidebar shows a file list (flat, grouped by operation type) that updates as new messages arrive during a live run.
- The sidebar is expanded by default; the user can collapse/expand it and the state is remembered across reloads (via electron-store).
- The file list survives page reloads and session switches.
- No click interaction or line diff counts for now.

---

## Current State

### Message storage
Sessions are stored as JSONL files in `~/.claude/projects/<slug>/<sessionId>.jsonl`. Each line is a raw Claude message object. **There is no SQL/Prisma database.** App-level state (sidebar collapse, active session, etc.) is persisted via `electron-store`.

### Types (`src/shared/types.ts`)
- `Turn` — one user↔assistant exchange, holds `assistantBlocks: AssistantBlock[]`.
- `ToolUseBlock` — `{ type: "tool_use", id, name, input: Record<string, unknown>, result? }`.
- `ToolName` union includes `"Write"`, `"Edit"`, `"Bash"`, `"Read"`, etc.

### Message parsing (`src/renderer/lib/parse-turns.ts`)
- `parseTurnsIncremental()` converts raw JSONL messages → `Turn[]`.
- `ToolUseBlock.input` contains tool-specific fields: `file_path` for Read/Edit/Write, `command` for Bash.

### Chat rendering
- `ChatView.tsx` — loads history via `useQuery(["sessionMessages", ...])` and assembles `messages = [...history, ...liveMessages]`. Renders `<MessageStream messages={messages} />`.
- `MessageStream.tsx` — calls `parseTurnsIncremental(messages)` → `Turn[]`, renders `<TurnBlock>` per turn.
- Live messages arrive via `window.api.claude.onMessage()` and are stored in `liveSession` Zustand store.

### Layout (`AppLayout.tsx` lines 131–149)
Two-panel `ResizablePanelGroup` (horizontal):
- Left: `SessionBrowser` (22% default, collapsible via `sidebarCollapsed` from `useUIStore`).
- Right: `ChatView` (78%).
- Collapsed state: `!sidebarCollapsed` guard wraps the left panel + handle.

### Persistence (`appState.service.ts`)
`PersistedAppState` (electron-store) fields: `openProjects`, `activeProjectPath`, `activeSessionId`, `activeSessionsByProject`, `sidebarCollapsed`, `pinnedSessionIds`, `scrollPositions`.

`setAppState(partial)` validates each field before writing. `getAppState()` reads and normalises on startup.

`AppLayout.tsx` (lines 64–67) subscribes to `useUIStore` and writes `sidebarCollapsed` back to electron-store whenever it changes.

### UIStore (`src/renderer/stores/ui.ts`)
```typescript
interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}
```
Hydrated from appState on mount (AppLayout line 79).

### i18n
No translation infrastructure exists yet in the renderer (`src/renderer/lib/locales/` does not exist, `useTranslation` is not used anywhere). Skip i18n for this feature.

---

## Approach

### Data derivation strategy
The file list is **derived from the Turn[]** already computed in ChatView/MessageStream. No new IPC channel or storage needed — the JSONL messages are the source of truth.

### File extraction rules
Scan every `ToolUseBlock` across all turns:
- `name === "Write"` → extract `input.file_path` as `string`, operation = `"created"`
- `name === "Edit"` → extract `input.file_path` as `string`, operation = `"modified"`
- `name === "Bash"` → parse `input.command` as `string`; if it matches `rm ` or `unlink ` patterns, extract the target path, operation = `"deleted"`. Keep Bash parsing intentionally simple.
- All other tools → ignore (Read, Glob, Grep etc. are not write operations)

**Dedup rule:** same path can appear multiple times. Keep track of all unique paths; the displayed operation type is the _last_ operation seen on that path (so if a file is created then edited, it shows as "modified"; if deleted after being created, it shows as "deleted").

### State: collapse toggle
Add `touchedFilesSidebarCollapsed: boolean` (default `false` = expanded):
1. **`appState.service.ts`** — add field to `PersistedAppState` and to `store` defaults; add validation branch in `setAppState`.
2. **`ui.ts`** store — add `touchedFilesSidebarCollapsed` + `toggleTouchedFilesSidebar` action.
3. **`AppLayout.tsx`** — subscribe to `useUIStore` and also persist `touchedFilesSidebarCollapsed` to appState (alongside the existing `sidebarCollapsed` write on line 66). Hydrate from appState on mount (alongside line 79).

### New utility: `src/renderer/lib/extract-touched-files.ts`
Export:
```typescript
export interface TouchedFile {
  path: string;
  operation: "created" | "modified" | "deleted";
}
export function extractTouchedFiles(turns: Turn[]): TouchedFile[]
```

### New component: `src/renderer/components/chat/TouchedFilesSidebar.tsx`
- Reads `activeSessionId` and `activeProjectPath` from sessions store.
- Queries `sessionMessages` (same TanStack Query key — will hit cache) to get history messages.
- Reads `liveMessages` from `liveSession` store.
- Combines messages, calls `parseTurnsIncremental`, then `extractTouchedFiles`.
- Builds a nested folder tree from the absolute paths (using the common ancestor as the root, or project path if available).
- Renders the tree as collapsible folder nodes with files underneath; files show a VS Code–style operation badge to the right:
  - `A` (green) for created
  - `M` (amber/orange) for modified
  - `D` (red) for deleted
- Header with title and a chevron button to collapse/expand.
- **No empty state** — the component is not rendered at all when there are no touched files.

### Layout change: `AppLayout.tsx`
Add a third `ResizablePanel` on the right for `TouchedFilesSidebar`, following the same conditional mount pattern as the left sidebar:

```jsx
<ResizablePanelGroup direction="horizontal" className="flex-1">
  {/* left sidebar — unchanged */}
  {!sidebarCollapsed && (
    <>
      <ResizablePanel defaultSize={22} minSize={15} maxSize={40} order={1}>
        <SessionBrowser />
      </ResizablePanel>
      <ResizableHandle />
    </>
  )}

  {/* main chat */}
  <ResizablePanel defaultSize={60} minSize={40} order={2}>
    <ChatView key={activeProjectPath ?? ""} />
  </ResizablePanel>

  {/* right: touched files sidebar — only when there are touched files AND not collapsed */}
  {hasTouchedFiles && !touchedFilesSidebarCollapsed && (
    <>
      <ResizableHandle />
      <ResizablePanel defaultSize={20} minSize={14} maxSize={35} order={3}>
        <TouchedFilesSidebar />
      </ResizablePanel>
    </>
  )}
</ResizablePanelGroup>
```

The `TouchedFilesSidebar` component itself has a header with a collapse button (`ChevronRight`) that calls `toggleTouchedFilesSidebar()`.

---

## Decisions

| Decision | Rationale |
|---|---|
| Derive file list from Turn[], no new storage | Messages already persist in JSONL. Re-deriving on load is cheap and avoids sync bugs. |
| Right sidebar at AppLayout level | Consistent with existing pattern (left sidebar is also at AppLayout level). Keeps ChatView clean. |
| Collapse state in UIStore + electron-store | Consistent with how `sidebarCollapsed` is handled today. |
| `Write` → "created", `Edit` → "modified" | Matches Claude tool semantics. Write creates/overwrites; Edit patches in place. |
| Last-operation-wins for dedup | Most useful for the user: shows current state of each file, not full history. |
| Skip i18n | No translation infrastructure exists yet; adding it now would be scope creep. |
| Bash: simple `rm`/`rm -rf` only | Bash commands are hard to parse reliably. Anything more complex is silently ignored. |
| Folder tree display, no raw paths | User wants a nested folder/file tree structure (like a file explorer), not a flat list of paths. Build a tree from the absolute paths. |
| Hide panel when no touched files | No empty state. The third panel is not mounted at all when `touchedFiles.length === 0`. |

---

## Todo

- [ ] Add `TouchedFile` interface to `src/shared/types.ts`
- [ ] Create `src/renderer/lib/extract-touched-files.ts` (extraction utility)
- [ ] Add `touchedFilesSidebarCollapsed` to `PersistedAppState` in `appState.service.ts`
- [ ] Add `touchedFilesSidebarCollapsed` + toggle to `useUIStore` in `src/renderer/stores/ui.ts`
- [ ] Update `AppLayout.tsx` to persist + hydrate `touchedFilesSidebarCollapsed` (alongside existing sidebarCollapsed logic)
- [ ] Create `src/renderer/components/chat/TouchedFilesSidebar.tsx`
- [ ] Update `AppLayout.tsx` to add the third panel + `<TouchedFilesSidebar />`
- [ ] Run `npm run build` and `npm run lint` — fix any issues
