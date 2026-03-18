# Plan: Persistent Chat State & Virtualization

_Started: 2026-03-18_
_Closed: 2026-03-18_

## Context

Three related improvements to session and chat UX:

1. **Per-project active session + scroll persistence** — remember which session was open and where the user was scrolled, per project, across app restarts.
2. **Instant scroll restore on load** — when opening a session, jump directly to the saved position (or bottom) without any scroll animation.
3. **Virtualization** — use TanStack Virtual for both the session list and the chat turn list to keep rendering fast for large histories.

### Current state (key findings)

- `PersistedAppState` (electron-store) saves `activeSessionId` as a **single global field** — not per project. Switching projects loses each project's last-selected session.
- `scrollPositions: Record<string, number>` exists in the Zustand `sessions` store but is **never saved to electron-store** — lost on restart.
- `MessageStream.tsx` calls `scrollToBottom()` with smooth animation on **every `messages` change**, including initial load — causes a visible scroll animation when opening a session.
- Neither `SessionBrowser` nor `MessageStream` uses virtualization — all sessions and all turns are rendered in the DOM.
- `@tanstack/react-virtual` is **not yet installed**.

---

## Approach

### Step 1 — Persist per-project active session (data layer)

**Where**: `src/main/services/appState.service.ts`, `src/renderer/components/layouts/AppLayout.tsx`

Replace the single `activeSessionId: string | null` in `PersistedAppState` with:

```ts
activeSessionsByProject: Record<string, string | null>;
```

- `getAppState`: read the map; set `activeSessionId` in the returned state by looking up `activeSessionsByProject[activeProjectPath]`.
- `setAppState`: when `activeSessionId` and `activeProjectPath` are both present, write `activeSessionsByProject[activeProjectPath] = activeSessionId`.
- Keep `activeSessionId` in Zustand store as-is (runtime convenience).
- `AppLayout.tsx`: when `activeProjectPath` changes (project switch), look up the stored session for the new project and call `setActiveSession`.
- Backward-compat: if the old `activeSessionId` key exists but `activeSessionsByProject` does not, treat the old value as the active session for `activeProjectPath`.

### Step 2 — Persist scroll positions (data layer)

**Where**: same files as Step 1 + `src/renderer/components/chat/MessageStream.tsx`

Add `scrollPositions: Record<string, number>` to `PersistedAppState`.

- Save via `AppLayout.tsx`'s store subscription (alongside other fields).
- Cap stored positions: only keep entries for sessions belonging to open projects (prune on save) or keep last 100 entries to avoid unbounded growth.
- On restore: load into `useSessionsStore.scrollPositions`.

### Step 3 — Instant scroll restore on chat load (no animation)

**Where**: `src/renderer/components/chat/MessageStream.tsx`, `src/renderer/components/chat/ChatView.tsx`

The current `useEffect([messages])` scrolls to bottom with smooth animation on every message update. Fix:

- Add `initialScrollPosition?: number` prop to `MessageStream` (passed from `ChatView`, which reads it from the sessions store).
- Track whether the component has completed its **initial render** with a `hasRestoredRef = useRef(false)`.
- On first non-empty `messages` render:
  - If `initialScrollPosition` is defined: jump to that offset using `viewport.scrollTop = initialScrollPosition` (instant, no animation).
  - If undefined (new session or no saved position): jump to bottom instantly (`behavior: 'auto'`).
  - Set `hasRestoredRef.current = true`.
- For subsequent `messages` changes (live streaming):
  - Only auto-scroll to bottom if the user was already near the bottom (within ~100px of end).
- Save scroll position back to store on scroll (debounced ~300ms), keyed by `activeSessionId`.
- `ChatView.tsx` passes `initialScrollPosition={scrollPositions[activeSessionId]}` to `MessageStream` and resets it on `activeSessionId` change.

> **Key**: the Radix `ScrollArea` wraps a `[data-radix-scroll-area-viewport]` div. Use `scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')` to get the actual scrollable container for direct `scrollTop` manipulation.

### Step 4 — Virtualize session list

**Where**: `src/renderer/components/sessions/SessionBrowser.tsx`

Install `@tanstack/react-virtual`. Replace the `ScrollArea` + mapped `SessionItem` list with a `useVirtualizer` setup.

- Container: replace Radix `ScrollArea` with a plain `div` with `overflow-y: auto` (ref = `parentRef`).
- All items to virtualize: flatten the display list (pending item, pinned section header, pinned items, separator, unpinned items) into a single typed array before passing to the virtualizer.
- `estimateSize`: ~44px per item, ~28px for section headers, 1px for separators.
- Render only virtual rows, positioned via `transform: translateY(...)` pattern.
- Empty/loading states remain outside the virtualizer (rendered unconditionally above the virtual list area).

### Step 5 — Virtualize chat turns

**Where**: `src/renderer/components/chat/MessageStream.tsx`

This is the most complex step. Replace the full turn render with `useVirtualizer`.

- Use **dynamic measurement** (`measureElement`) since turn heights vary significantly.
- Replace Radix `ScrollArea` with a plain scrollable `div` (removes complexity of targeting the inner viewport).
- `estimateSize`: start with a generous estimate (~200px per turn) — `measureElement` will correct it.
- Integrate with scroll restore (Step 3): use `virtualizer.scrollToOffset(savedPosition, { behavior: 'auto' })` on initial load.
- "Near bottom" detection for live auto-scroll: compare `scrollTop + clientHeight >= scrollHeight - 100`.
- "Scroll to bottom" button: remains, now calls `virtualizer.scrollToIndex(turns.length - 1, { behavior: 'smooth' })`.
- `isLive` prop: when true and user is near bottom, call `scrollToIndex(last)` on each new turn.

---

## Decisions

| Decision | Rationale |
|---|---|
| `activeSessionsByProject` map replaces single `activeSessionId` in persistence | Per-project memory is the core ask; additive, backward-compatible |
| Keep `activeSessionId` in Zustand as a single value (runtime) | No need to change how the rest of the UI reads it |
| Store scroll position as **pixel offset** (not turn index) | Simpler for non-virtualized case; virtualizer can use `scrollToOffset` |
| Cap scroll positions to open projects on save | Prevents unbounded electron-store growth |
| Replace Radix `ScrollArea` with plain `div` in `MessageStream` | TanStack Virtual needs direct access to the scrollable element; avoids querying inner viewport through Radix |
| Keep Radix `ScrollArea` in `SessionBrowser` (replace with plain div only for virtualized area) | The session list is a narrower column where Radix custom scrollbars are less critical |
| `estimateSize` starts at 200px for chat turns | Conservative over-estimate is fine; `measureElement` corrects actual sizes |
| Debounce scroll save at 300ms | Avoids hammering the store on every scroll pixel |
| Install `@tanstack/react-virtual` | No existing virtualizer in the stack; TanStack family is already used (Query) |

---

## Todo

- [ ] Install `@tanstack/react-virtual`
- [ ] Step 1: Add `activeSessionsByProject` to `PersistedAppState` + update `getAppState`/`setAppState`
- [ ] Step 1: Update `AppLayout.tsx` to restore per-project session on project switch
- [ ] Step 2: Add `scrollPositions` to `PersistedAppState` + save/restore logic
- [ ] Step 2: Prune stale scroll positions on save (only keep open project sessions)
- [ ] Step 3: Add `initialScrollPosition` prop to `MessageStream`, implement instant restore logic
- [ ] Step 3: Add scroll save callback (debounced) in `MessageStream`, wire up in `ChatView`
- [ ] Step 3: Fix "near bottom" guard so live streaming only auto-scrolls when already at bottom
- [ ] Step 4: Virtualize session list in `SessionBrowser` with `useVirtualizer`
- [ ] Step 5: Virtualize chat turns in `MessageStream` with dynamic measurement
- [ ] Verify `npm run build` passes
- [ ] Verify `npm run lint` passes with zero warnings
