# Clay — Feature List

Clay is a desktop IDE for Claude Code. It wraps the `claude` CLI with a rich GUI: multi-session browsing, real-time message streaming, tool permission management, file exploration, and full conversation history. This document catalogs the full feature surface — existing and planned.

---

## Session Management


**Session summary display** — If the Claude session has a generated summary it is shown as the session title. Otherwise the first user prompt is used.

**Relative timestamps** — Each session item shows how long ago it was last active ("2 hours ago", "yesterday") rather than an absolute date.

**Active session highlight** — The currently viewed session is visually distinguished with an accent-colored left border.

**Running session indicator** — Sessions that are currently executing show an animated spinner so the user can see activity even when browsing other sessions.

**Pending permission indicator** — Sessions with an unresolved tool approval request show a pulsing red dot, alerting the user to switch back and respond.

**Unseen activity badge** — Sessions that received new messages while the user was viewing a different session are marked so the user knows to check them.

**Git branch badge** — When a session's metadata contains git branch information it is displayed as a small badge on the session item and in the chat header.

**Session resumption** — Any historical session can be resumed. Selecting it and typing a new message continues the conversation from where it left off, sending the follow-up to the running `claude` process.

**Session deletion** — Individual sessions can be deleted from the session browser, removing the JSONL file from disk after confirmation.

**Session renaming / custom summary** — Users can manually override the auto-generated session summary with a custom name for easier identification.

**Session pinning** — Sessions can be pinned to the top of the session browser so frequently referenced conversations are always accessible.

**Session tagging** — Users can apply freeform tags to sessions (e.g. "refactor", "bug-fix") and filter the session browser by tag.

**Bulk session actions** — Select multiple sessions to delete, archive, or export them all at once.

**Session export** — Export a session's full conversation as Markdown, JSON, or plain text for sharing or archiving outside the app.

**Session archive** — Archive old sessions to hide them from the default view without permanently deleting them.

---

## Chat & Messaging

**Real-time message streaming** — As the `claude` CLI produces output, each JSONL line is forwarded to the renderer immediately. Messages appear token by token, giving a live view of Claude's work.

**Full conversation history** — Selecting a historical session loads the entire JSONL transcript from disk and renders every turn, including all tool calls and their results.

**Multi-turn display** — Each user-assistant exchange is grouped into a numbered turn block with a timestamp. The boundary between turns is visually separated.

**Auto-scroll to bottom** — The message stream automatically scrolls to the latest message as new content arrives during a live session.

**Scroll-to-bottom button** — When the user scrolls up to read earlier messages a floating button appears; clicking it jumps back to the bottom and resumes auto-scroll.

**Scroll position memory** — If the user switches to another session and returns, the scroll position is restored to where they left off.

**Skeleton loading state** — While historical messages are being loaded from disk a skeleton placeholder is shown instead of a blank panel.

**Chat input with auto-expand** — The message textarea grows as the user types, up to a maximum of six visible lines, then becomes scrollable.

**Model selector** — A dropdown in the chat input lets the user choose between sonnet, opus, and haiku before sending a message. The selection is shown in the chat header badge.

**Effort level selector** — A separate dropdown lets the user set the thinking effort (low, medium, high), which is forwarded to the CLI as the `--effort` flag.

**Send on Enter / newline on Shift+Enter** — Standard keyboard behaviour for chat: Enter submits, Shift+Enter inserts a line break.

**Cancel running session** — A cancel button appears while a session is active. Clicking it sends SIGTERM to the `claude` process and marks the session as stopped.

**Continuation input** — When a session has completed but is selected in the browser, the input shows a "continue" state. Sending a message resumes the same session rather than starting a new one.

**Error display** — If the `claude` process exits with a non-zero code or emits on stderr, the error message is shown inline in the chat view with a distinct error style.

**Cost and token display** — Each turn can optionally show input token count, output token count, estimated cost in USD, and wall-clock duration pulled from the JSONL result message.

**Conversation statistics** — A summary view at the end of a completed session shows totals: turns, tokens in, tokens out, total cost, total duration.

**Message search within session** — A search bar lets the user find specific text within the current session's conversation, with match highlighting and navigation.

**Copy message** — Individual text blocks or entire turns can be copied to the clipboard with a single button.

**Copy code block** — Code blocks inside assistant messages have a dedicated copy button in the top-right corner.

**Jump to turn** — A turn navigator lets the user jump directly to any numbered turn in a long conversation.

---

## Markdown & Content Rendering

**Full Markdown rendering** — Assistant text messages are rendered as rich Markdown using `react-markdown` + `remark-gfm`. Supported elements: paragraphs, headings, bold, italic, strikethrough, inline code, code blocks, ordered lists, unordered lists, task lists, tables, blockquotes, horizontal rules, and hyperlinks.

**Syntax-highlighted code blocks** — Fenced code blocks are rendered with language-specific syntax highlighting. The language is shown as a label on the block.

**Thinking block display** — Extended thinking output is shown in a collapsible block with a "Thinking…" label and a brain icon. By default collapsed to avoid visual noise; expandable on demand.

**Inline code styling** — Backtick-wrapped inline code is rendered with a distinct monospace style and subtle background.

**Table rendering** — Markdown tables are rendered with alternating row shading and a header row style for readability.

**Blockquote rendering** — Blockquotes use a left-border accent and muted text colour.

**Hyperlink handling** — Links inside assistant messages open in the system default browser rather than inside the Electron window.

---

## Tool Call Visualization

**Tool call blocks** — Every tool invocation Claude makes is displayed as a collapsible block in the message stream. The block shows the tool name, a human-readable summary of the input, and (when available) the result.

**Tool colour coding** — Each tool type has a distinct colour scheme: blue for read/search operations, green for write operations, amber for shell execution, purple for grep/glob, cyan for agent/task tools.

**Tool icon mapping** — Each tool type is paired with a matching icon (file, terminal, search, globe, etc.) for quick visual identification.

**Collapsed by default** — Tool call blocks are collapsed when there is a result available, keeping the conversation readable. They can be expanded to see full input/output.

**Tool input details** — Expanding a tool call shows all input parameters, formatted as key-value pairs. Long values are truncated with a "show more" expansion.

**Tool result formatting — Read/Write/Edit** — File content results are displayed in a scrollable, monospace preview box with the file path as a header.

**Tool result formatting — Bash** — Shell command results split stdout and stderr into separate labelled sections. JSON output is pretty-printed. Non-zero exit codes are shown with an error badge.

**Tool result formatting — WebSearch** — Search results are displayed as a list of cards, each showing title, URL, and snippet.

**Tool result formatting — Grep/Glob** — File match results show each matched file path with line numbers and matched content, similar to IDE search results.

**Tool result formatting — Edit diff** — Edit tool results are displayed as a unified diff with green `+` and red `-` lines.

**Result metadata** — Tool result blocks show execution duration and byte count (where available) as small metadata labels.

**Error badge** — Tool calls that returned an error are labelled with a red "Error" badge on the collapsed block header so errors are visible at a glance.

**Nested agent tool blocks** — `Agent` and `Task` tool calls are rendered as special expandable blocks that load and display the full subagent conversation tree, including all its own tool calls, recursively.

**Subagent message loading** — When an agent tool block is expanded, the app loads the subagent's JSONL messages from disk by matching the parent `promptId`, then renders them as a nested turn stream.

**Subagent status indicators** — Running subagents show an animated spinner; completed subagents show a checkmark. The turn count is displayed in the block header.

**Token and cost per tool** — Where the JSONL data includes per-tool latency and token usage, this information is surfaced on the tool block.

---

## Tool Permission System

**Inline permission request** — When Claude attempts to use a tool that requires approval, a permission card appears directly in the chat stream at the point where execution paused.

**Tool input summary** — The permission card shows a human-readable summary of what the tool is about to do: file path for Read, command for Bash, URL for WebFetch, etc.

**Full input detail** — The permission card can be expanded to show every raw input parameter for the pending tool call.

**Allow / Deny buttons** — The user approves or denies the tool call with clearly labelled buttons. Deny causes the tool to return an error to Claude.

**Always-allow checkbox** — The permission card has a checkbox labelled "Always allow this tool". Checking it and approving stores the tool name in persistent settings so future calls are auto-approved without prompting.

**Auto-approval notification** — When a tool is auto-approved from the always-allow list, a subtle notification is shown in the chat stream so the user is aware it ran.

**Always-allow management** — A settings screen lists all always-allowed tools and lets the user remove individual entries or clear the entire list.

**Per-project permission profiles** — Always-allow rules can be scoped to a specific project directory rather than being global, so different projects have independent permission sets.

**HTTP approval server** — The main process runs a local HTTP server that the `claude` CLI hooks into via `PreToolUse`. This allows the GUI to intercept every tool call regardless of which terminal or shell the CLI thinks it is running in.

**Timeout fallback** — If the user does not respond to a permission request within a configurable timeout, the request is automatically allowed (safe default for long-running unattended sessions).

**Permission history log** — A log view shows all permission decisions made in a session: which tool, what input, allowed or denied, and when.

---

## File Explorer

**Project file tree** — The right sidebar renders a recursive file tree of the active project directory, mirroring IDE-style navigation.

**Directory expansion** — Clicking a directory node expands or collapses its children. Expanded state is preserved while the directory is in view.

**Sorted listing** — Directories are listed before files; within each group entries are sorted alphabetically.

**Noise filtering** — Well-known noisy paths are automatically hidden: `node_modules`, `.git`, `.next`, `.cache`, `dist`, `out`, `build`, `.DS_Store`, `Thumbs.db`, and other hidden files (except `.gitignore`).

**File content preview** — Clicking a file opens its content in a read-only preview panel. Files larger than 512 KB show a size warning instead of content.

**File type icons** — Files are shown with icons matched to their extension (code files vs generic files). Directories use a folder icon.

**Refresh button** — A refresh button in the file explorer header re-reads the directory from disk, picking up any files created or modified by Claude during the session.

**Active project display** — The file explorer header shows the active project path (truncated if long) so the user always knows which directory is being browsed.

**File search** — A search box at the top of the file explorer filters visible files by name across all depth levels.

**Open in editor** — A context menu or button on file items opens the file in the user's configured external editor (e.g. VS Code, Cursor).

**Open in Finder/Explorer** — A context menu option reveals the file in the native file manager.

**File creation** — Users can create new files or folders directly from the file explorer without leaving the app, with the new item immediately visible in the tree.

**File deletion** — Users can delete files or directories from the file explorer with a confirmation prompt.

**File renaming** — Inline renaming by double-clicking a file or folder name in the tree.

**Drag and drop** — Files can be dragged from the file explorer and dropped into the chat input to attach their contents or path to the next message.

---

## Layout & Navigation

**Three-panel layout** — The main window is divided into three resizable panels: the session browser on the left, the chat view in the center, and the file explorer on the right.

**Resizable panels** — Panel dividers can be dragged to adjust the width of each section. Sizes persist across app restarts.

**Collapsible sidebars** — Each sidebar can be fully collapsed to maximize the chat area. State is preserved.

**Keyboard shortcut: toggle session sidebar** — `⌘/Ctrl + B` shows or hides the left panel.

**Keyboard shortcut: toggle file sidebar** — `⌘/Ctrl + E` shows or hides the right panel.

**Keyboard shortcut: focus session search** — `⌘/Ctrl + K` moves focus to the session search input.

**Keyboard shortcut: focus chat input** — `/` focuses the chat input from anywhere in the app.

**Draggable title bar** — On macOS the custom title bar area is draggable so the window can be repositioned without a native title bar.

**Minimum window size** — The window enforces a minimum size of 900×600 px to prevent layouts from collapsing below usable thresholds.

**macOS native styling** — The window uses `hiddenInset` title bar style for a native macOS look with traffic-light buttons overlaid on the app chrome.

**Window state persistence** — Window size and position are restored when the app is reopened.

**Full-screen support** — The app supports entering and exiting full-screen mode via the standard macOS/Windows controls.

---

## Settings & Configuration

**Always-allowed tools list** — Displays and edits the list of tools that are auto-approved without a prompt, stored persistently via `electron-store`.

**Default model selection** — A global default model (sonnet/opus/haiku) that pre-fills the model selector for every new session.

**Default effort level** — A global default effort level (low/medium/high) pre-filled for new sessions.

**Theme selection** — Switch between dark mode and light mode. System-level "follow OS" option also available.

**Font size adjustment** — Increase or decrease the base font size used in the chat view and code blocks.

**Editor integration** — Configure the external editor command used by "Open in editor" actions (e.g. `code`, `cursor`, `vim`).

**Session storage location** — Display the path where Claude Code stores JSONL session files (`~/.claude/projects/`), with a button to reveal it in Finder/Explorer.

**Keyboard shortcut customisation** — Reassign any built-in keyboard shortcut to a custom key combination.

**Notification preferences** — Configure which events trigger desktop notifications: session completion, permission requests, errors.

**Auto-approve timeout** — Set the number of seconds before an unanswered permission request is automatically allowed.

**Startup behaviour** — Choose whether the app opens the last active session, shows the session browser, or starts a new empty chat on launch.

---

## Notifications & Alerts

**Desktop notifications — session complete** — A system notification fires when a long-running session finishes, so the user does not have to watch the app.

**Desktop notifications — permission required** — A system notification fires when a tool approval is pending in a backgrounded session.

**Desktop notifications — error** — A system notification fires when a session exits with an error.

**In-app toasts** — Non-critical feedback (e.g. "Session copied", "Always-allow updated") uses Sonner toasts so the user is informed without blocking the UI.

**Badge count on dock icon** — The macOS dock icon shows a badge with the number of sessions that have pending permission requests.

---

## Performance & Reliability

**Incremental JSONL streaming** — Messages are forwarded to the renderer line by line as they are produced. The UI never waits for the full response before rendering.

**TanStack Query caching** — Session list and historical messages are cached client-side. Switching between sessions that have already been loaded is instant.

**Cache invalidation on new session** — When a new session is created or an existing one completes, the relevant queries are invalidated so the session browser reflects fresh data.

**Process isolation** — The `claude` CLI runs as a child process in the main Electron process, fully isolated from the renderer. A crashed CLI does not crash the GUI.

**Graceful cancellation** — Cancelling a session sends SIGTERM to the child process and waits for it to exit cleanly before marking the session as stopped.

**PATH resolution from login shell** — On macOS the app spawns a login shell to read the user's full PATH before launching `claude`, ensuring the correct binary is found even when installed via a version manager.

**Large file guard** — Files over 512 KB are not fully loaded into the renderer to prevent memory pressure; a placeholder message is shown instead.

**Lazy subagent loading** — Subagent messages are only fetched from disk when the user expands the agent tool block, avoiding unnecessary I/O for large sessions.

---

## Internationalisation

**Multi-language support** — All user-facing strings are managed through `react-i18next`. No hardcoded strings in the UI.

**English locale** — Full `en.ts` translation file covering every key in the app.

**Dutch locale** — Full `nl.ts` translation file as a second supported language.

**Runtime language switching** — Users can switch the UI language in settings without restarting the app.

**Locale auto-detection** — On first launch the app selects the language that matches the OS locale, falling back to English.

**Pluralisation support** — Count-based strings (e.g. "1 session", "3 sessions") use i18next pluralisation rules rather than manual ternaries.

---

## Developer & Power-User Features

**IPC channel tracing** — A developer console mode logs every IPC message (channel name, payload) to aid debugging during development.

**Always-allow reset on dev startup** — In development mode the always-allowed tool list is cleared on each app launch so permission flows are always exercised.

**Raw JSONL inspector** — A toggle on any session allows viewing the raw unparsed JSONL lines that back the conversation, useful for debugging the session service.

**External link routing** — All `<a>` links that point to external URLs are intercepted and opened in the system browser rather than inside Electron.

**Session JSONL path display** — The session detail view shows the exact filesystem path of the backing JSONL file so power users can locate it directly.

**Approval server port display** — The port the local HTTP approval server is listening on is surfaced in the developer info panel.

**Drag-and-drop project folder** — Dragging a folder from the Finder/Explorer onto the app window opens a new chat scoped to that directory.

**Command palette** — A fuzzy-search command palette (`⌘ P`) surfaces all sessions, settings actions, and shortcuts in one place.

**Zoom controls** — Standard Electron zoom in/out/reset keybindings (`⌘ +`, `⌘ -`, `⌘ 0`) are supported.

---

## Planned / Future Features

**Multiple simultaneous sessions** — Run more than one `claude` process in parallel, each streaming independently into its own chat panel.

**Split-pane chat** — View two sessions side by side in the center panel for comparison or parallel work.

**Session templates** — Save a prompt, model, and effort combination as a named template that can be launched with one click.

**Prompt library** — A personal library of reusable prompts, snippets, and system message prefixes that can be inserted into the chat input.

**Slash commands** — Type `/` in the chat input to bring up an autocomplete menu of saved prompts and common operations.

**Session branching** — Fork a session at any turn to explore an alternative direction without losing the original conversation.

**Diff view for file changes** — When Claude edits files, show a before/after diff in the file explorer or a dedicated changes panel.

**Git integration** — Show the current git status (changed files, staged changes, branch, unpushed commits) in a dedicated panel alongside the file explorer.

**Commit and PR actions** — Buttons in the git panel to stage, commit, push, or open a pull request directly from the app after a session that made code changes.

**Terminal panel** — An embedded terminal at the bottom of the layout so the user can run commands in the project directory without switching apps.

**Multi-file context attachment** — Attach multiple files or entire directories to a message so Claude has explicit context without needing to read them via tool calls.

**Image attachment** — Drag and drop or paste images into the chat input to include them in the next message to Claude.

**Session sharing** — Generate a shareable read-only link or exportable HTML snapshot of a session for sharing with teammates.

**Team workspaces** — Shared session libraries and permission profiles for teams, with role-based access control.

**Usage analytics dashboard** — A personal dashboard showing token usage, cost, session counts, and model distribution over time, with per-project breakdowns.

**Monthly cost budget** — Set a monthly spending cap; the app warns (and optionally blocks) new sessions when the cap is approaching.

**Custom system prompt** — A per-session or global system prompt field that is prepended to every conversation with Claude.

**Tool allowlist / blocklist per project** — Define which tools Claude is permitted to use on a per-project basis, independent of the always-allow list.

**Session replay** — Step through a completed session turn by turn, like a debugger, to understand the sequence of tool calls and decisions.

**Offline mode indicator** — Detect network connectivity and surface a clear offline indicator when the app cannot reach the Claude API.

**Auto-update** — Electron auto-updater checks for new releases and prompts the user to install updates in the background.

**macOS menu bar integration** — A menu bar icon gives quick access to start a new session, view pending permissions, and check recent session status without bringing the main window to the foreground.

**Tray icon with session status** — The system tray icon changes appearance to reflect the state of all running sessions (idle, active, awaiting permission).

**Accessibility** — Full keyboard navigation for all interactive elements, ARIA labels on dynamic regions, and support for macOS VoiceOver and Windows Narrator.

**High-contrast mode** — A high-contrast theme for users with visual impairments, in addition to the standard light and dark themes.
