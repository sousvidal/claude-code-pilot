import { registerSessionHandlers } from "./sessions";
import { registerFileHandlers } from "./files";
import { registerClaudeHandlers } from "./claude";
import { registerPermissionHandlers } from "./permissions";

export function registerAllHandlers(): void {
  registerSessionHandlers();
  registerFileHandlers();
  registerClaudeHandlers();
  registerPermissionHandlers();
}
