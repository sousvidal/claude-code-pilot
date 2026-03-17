import { useState } from "react";

import { Button } from "~/components/ui/button";
import { getToolConfig } from "~/lib/chat-tools";
import { cn } from "~/lib/utils";
import type { PermissionRequest } from "../../../shared/types";

interface PermissionRequestBlockProps {
  request: PermissionRequest;
  onAllow: (alwaysAllow: boolean) => void;
  onDeny: () => void;
}

function getInputSummary(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "Bash":
      return typeof input.command === "string" ? input.command : "";
    case "Read":
    case "Write":
    case "Edit":
      return typeof input.file_path === "string" ? input.file_path : "";
    case "Glob":
      return typeof input.pattern === "string" ? input.pattern : "";
    case "Grep":
      return typeof input.pattern === "string" ? input.pattern : "";
    case "WebFetch":
      return typeof input.url === "string" ? input.url : "";
    case "WebSearch":
      return typeof input.query === "string" ? input.query : "";
    case "Agent":
      return typeof input.description === "string" ? input.description : "";
    default:
      return JSON.stringify(input);
  }
}

function formatInputDetails(input: Record<string, unknown>): string {
  const entries = Object.entries(input)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => {
      const val =
        typeof v === "string"
          ? v
          : typeof v === "object"
            ? JSON.stringify(v, null, 2)
            : String(v);
      return `${k}: ${val}`;
    });
  return entries.join("\n");
}

export function PermissionRequestBlock({
  request,
  onAllow,
  onDeny,
}: PermissionRequestBlockProps) {
  const [alwaysAllow, setAlwaysAllow] = useState(false);
  const config = getToolConfig(request.toolName);
  const Icon = config.icon;
  const summary = getInputSummary(request.toolName, request.toolInput);
  const details = formatInputDetails(request.toolInput);

  return (
    <div className="mx-auto max-w-6xl px-6 py-2">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium",
              config.bg,
              config.text,
            )}
          >
            <Icon className="h-4 w-4" />
            {request.toolName}
          </span>
          {summary && (
            <span className="min-w-0 flex-1 truncate font-mono text-sm text-muted-foreground">
              {summary}
            </span>
          )}
        </div>

        {details && (
          <div className="px-4 py-3">
            <pre className="max-h-48 overflow-auto rounded-md bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground whitespace-pre-wrap">
              {details}
            </pre>
          </div>
        )}

        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            size="sm"
            onClick={() => onAllow(alwaysAllow)}
            className="bg-accent-green hover:bg-accent-green/90 text-white"
          >
            Allow
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onDeny}
            className="bg-accent-red hover:bg-accent-red/90"
          >
            Deny
          </Button>
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={alwaysAllow}
              onChange={(e) => setAlwaysAllow(e.target.checked)}
              className="rounded border-input accent-accent-green"
            />
            Always allow this tool
          </label>
        </div>
      </div>
    </div>
  );
}
