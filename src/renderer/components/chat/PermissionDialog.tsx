import { useState } from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { getToolConfig } from "~/lib/chat-tools";

interface PermissionDialogProps {
  toolName: string;
  input: Record<string, unknown>;
  onAllow: () => void;
  onDeny: () => void;
  onAlwaysAllow: () => void;
}

function formatInputDetails(input: Record<string, unknown>): string {
  const entries = Object.entries(input)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => {
      const val =
        typeof v === "string"
          ? v
          : typeof v === "object"
            ? JSON.stringify(v)
            : String(v);
      return `${k}: ${val}`;
    });
  return entries.join("\n");
}

export function PermissionDialog({
  toolName,
  input,
  onAllow,
  onDeny,
  onAlwaysAllow,
}: PermissionDialogProps) {
  const [alwaysAllow, setAlwaysAllow] = useState(false);
  const config = getToolConfig(toolName);
  const Icon = config.icon;
  const details = formatInputDetails(input);

  const handleAllow = () => {
    if (alwaysAllow) onAlwaysAllow();
    else onAllow();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-w-md w-full rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium",
                config.bg,
                config.text,
              )}
            >
              <Icon className="h-4 w-4" />
              {toolName}
            </span>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground whitespace-pre-wrap">
            {details || "No input details"}
          </div>
          <p className="text-sm text-foreground">
            Allow this tool to run?
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleAllow}
              className="flex-1 bg-accent-green hover:bg-accent-green/90 text-white"
            >
              Allow
            </Button>
            <Button
              onClick={onDeny}
              variant="destructive"
              className="flex-1 bg-accent-red hover:bg-accent-red/90"
            >
              Deny
            </Button>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={alwaysAllow}
              onChange={(e) => setAlwaysAllow(e.target.checked)}
              className="rounded border-input"
            />
            Always allow this tool
          </label>
        </div>
      </div>
    </div>
  );
}
