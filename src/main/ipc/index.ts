import { registerSessionHandlers } from "./sessions";
import { registerFileHandlers } from "./files";
import { registerClaudeHandlers } from "./claude";
import { registerPermissionHandlers } from "./permissions";
import { registerShellHandlers } from "./shell";
import { registerAppStateHandlers } from "./appState";
import { registerCommandHandlers } from "./commands";

export function registerAllHandlers(): void {
  registerSessionHandlers();
  registerFileHandlers();
  registerClaudeHandlers();
  registerPermissionHandlers();
  registerShellHandlers();
  registerAppStateHandlers();
  registerCommandHandlers();
}
