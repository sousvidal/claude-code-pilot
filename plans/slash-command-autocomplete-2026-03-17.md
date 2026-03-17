# Plan: Slash Command Autocomplete

_Started: 2026-03-17_

## Context

When a user types `/` in the `ChatInput`, they should see a popover with all available Claude Code slash commands. The list should include:

- **Built-in commands** — hardcoded list (e.g. `/help`, `/clear`, `/compact`, `/review`, etc.)
- **User-defined commands** — `.md` files in `~/.claude/commands/` (e.g. `plan-start.md` → `/plan-start`)
- **Project-level commands** — `.md` files in `{activeProjectPath}/.claude/commands/`
- **Plugin commands** — from `~/.claude/plugins/` (future, skip for now)

Currently `ChatInput.tsx` has no slash command awareness at all — it just passes raw text straight to the Claude CLI.

## Approach

### 1. Main-process: `commands.service.ts`
Read `~/.claude/commands/` and `{projectPath}/.claude/commands/` from disk, returning a unified list. Parse the first non-empty line of each `.md` file as a short description.

### 2. New IPC channel: `commands:list`
- Handler in `src/main/ipc/commands.ts`
- Register in `src/main/ipc/index.ts`
- Expose via preload: `window.api.commands.list(projectPath?)`
- Type in `src/shared/api.d.ts`

### 3. Renderer service: `commands.service.ts`
Thin wrapper around `window.api.commands.list`.

### 4. Autocomplete UI in `ChatInput.tsx`
- Detect trigger: `/` at start of input or after whitespace
- Extract the partial command (e.g. `/cle` → query `"cle"`)
- TanStack Query to fetch the command list (once, cached)
- Filter the list client-side based on the partial
- Show a positioned `div` above the textarea with filtered results
- Keyboard nav: `↑`/`↓` to move, `Enter`/`Tab` to complete, `Escape` to dismiss
- On select: replace the `/...` token in the input with the full command name + space

### Command data shape
```ts
interface SlashCommand {
  name: string;         // e.g. "clear", "plan-start"
  description: string;  // first non-empty line of .md body, or built-in description
  source: "builtin" | "user" | "project";
}
```

### Built-in commands (hardcoded)
`/help`, `/clear`, `/compact`, `/cost`, `/doctor`, `/exit`, `/init`, `/login`, `/logout`,
`/pr_comments`, `/release-notes`, `/review`, `/status`, `/terminal-setup`, `/vim`, `/bug`, `/memory`

## Decisions

- **No new package needed** — positioning handled with Tailwind + relative/absolute. Radix `Popover` is available but a plain `div` keeps it simpler and avoids focus trapping issues inside a textarea.
- **Project commands refresh** — use `activeProjectPath` as part of the TanStack Query key so the list re-fetches on project switch.
- **Trigger condition** — only activate when the current word (split by whitespace) starts with `/`. This allows users to type URLs without triggering autocomplete.
- **i18n** — no user-visible strings in the autocomplete itself except command descriptions (which come from file content), so minimal i18n work needed.

---

## Todo

- [x] Create `src/main/services/commands.service.ts`
- [x] Create `src/main/ipc/commands.ts` + register in `index.ts`
- [x] Expose `commands.list` in `src/preload/index.ts`
- [x] Declare type in `src/shared/api.d.ts`
- [x] Create `src/renderer/services/commands.service.ts`
- [x] Build autocomplete UI into `ChatInput.tsx`
- [x] Run `npm run build` + `npm run lint` — both pass
