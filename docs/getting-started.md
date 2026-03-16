# Getting Started

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | ≥ 20 | Required to run the dev toolchain |
| npm | ≥ 10 | Comes with Node.js |
| Claude CLI | latest | `npm install -g @anthropic-ai/claude-code` |

The app shells out to the `claude` binary at runtime. It must be on your `PATH`. On macOS the app resolves your full login-shell `PATH` automatically, so version managers (nvm, mise, fnm) work without extra configuration.

---

## Installation

```bash
git clone <repo-url>
cd claude-code-pilot
npm install
```

---

## Development

```bash
npm run dev
```

This starts `electron-vite dev`, which:

1. Spins up a Vite dev server for the renderer (with HMR).
2. Compiles and watches the main process and preload scripts.
3. Launches the Electron window pointed at the Vite dev server URL.

Changes to renderer code hot-reload instantly. Changes to the main process or preload restart the Electron process.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the app in development mode with HMR |
| `npm run build` | Compile all processes and produce a production build in `out/` |
| `npm run preview` | Preview the production build without packaging |
| `npm run lint` | Run ESLint across the entire project (zero warnings allowed) |
| `npm run format` | Format all files with Prettier |
| `npm run typecheck` | Run `tsc --noEmit` to check types without emitting files |

Run `npm run build && npm run lint` after every change to catch type errors and lint issues before committing.

---

## Project Configuration

No `.env` file or manual configuration is required to run the app. The Claude CLI reads your Anthropic API key from its own configuration (`~/.claude/` or the `ANTHROPIC_API_KEY` env var set in your shell profile).

The app deliberately strips `ANTHROPIC_API_KEY` from the child process environment so the key from your shell does not override the CLI's own auth. Set credentials via `claude auth` or the CLI's built-in configuration.

Settings that the app itself persists (always-allowed tools, etc.) are stored by `electron-store` in the platform's standard app data directory:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/clay/` |
| Linux | `~/.config/clay/` |
| Windows | `%APPDATA%\clay\` |

---

## Building for Production

```bash
npm run build
```

Output is written to `out/`:

```
out/
├── main/       # Compiled main process
├── preload/    # Compiled preload script
└── renderer/   # Compiled renderer (static files)
```

To package the app into a distributable (`.dmg`, `.exe`, etc.) you will need to add `electron-builder` or `@electron-forge/cli` — neither is included yet.

---

## Tech Stack

| Concern | Library |
|---|---|
| App shell | Electron 41 |
| UI framework | React 19 |
| UI components | Shadcn/ui + Radix UI |
| Styling | Tailwind CSS v4 |
| State management | Zustand 5 |
| Async data | TanStack Query 5 |
| Forms | React Hook Form + Zod |
| Markdown | react-markdown + remark-gfm |
| Code editor | Monaco Editor |
| Routing | React Router 7 |
| i18n | react-i18next |
| Logging | Pino (main process) |
| Toasts | Sonner |
| Settings | electron-store |
| Build | electron-vite + Vite 6 |

---

## Adding a New IPC Channel

When adding a feature that requires main-process access, follow these four steps in order:

1. **Handler** — add the `ipcMain.handle` call in the appropriate file under `src/main/ipc/` (or create a new domain file and register it in `src/main/ipc/index.ts`).
2. **Preload** — expose the method in `src/preload/index.ts` via `ipcRenderer.invoke`.
3. **Type declaration** — add the method signature to the `Window.api` interface in `src/shared/api.d.ts`.
4. **Renderer service** — add a wrapper in `src/renderer/services/` and call it from your component or query function.

Never call `window.api` directly from a component — always go through a renderer service.
