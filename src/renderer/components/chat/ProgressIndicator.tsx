import { Loader2 } from "lucide-react";

interface ProgressIndicatorProps {
  toolName: string;
  content?: string;
  elapsedMs?: number;
  query?: string;
  resultCount?: number;
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${Math.round(ms / 100) / 10}s`;
  return `${Math.floor(ms / 1000)}s`;
}

function getLastLines(text: string, count: number): string[] {
  const lines = text.trim().split("\n").filter(Boolean);
  return lines.slice(-count);
}

export function ProgressIndicator({
  toolName,
  content,
  elapsedMs = 0,
  query,
  resultCount,
}: ProgressIndicatorProps) {
  if (toolName === "Bash" && content != null) {
    const lastLines = getLastLines(content, 3);
    return (
      <div className="space-y-1 font-mono text-xs text-muted-foreground">
        {lastLines.map((line, i) => (
          <div key={i} className="truncate">
            {line}
          </div>
        ))}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>
            Running...
            {elapsedMs > 0 && (
              <span className="animate-pulse"> {formatElapsed(elapsedMs)}</span>
            )}
          </span>
        </div>
      </div>
    );
  }

  if (toolName === "WebSearch") {
    return (
      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Searching...</span>
        {query && (
          <span className="truncate max-w-[200px]" title={query}>
            &quot;{query}&quot;
          </span>
        )}
        {resultCount != null && (
          <span className="text-muted-foreground/80">({resultCount} results)</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span>{toolName} — Working...</span>
    </div>
  );
}
