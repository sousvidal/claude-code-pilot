import { registerSessionHandlers } from "./sessions";
import { registerFileHandlers } from "./files";
import { registerClaudeHandlers } from "./claude";

export function registerAllHandlers(): void {
  registerSessionHandlers();
  registerFileHandlers();
  registerClaudeHandlers();
}
