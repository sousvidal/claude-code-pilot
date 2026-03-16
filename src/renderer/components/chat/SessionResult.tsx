import { Badge } from "~/components/ui/badge";
import { formatCost, formatDuration } from "~/lib/utils";

interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
}

interface SessionResultProps {
  costUsd?: number;
  durationMs?: number;
  turns?: number;
  isError?: boolean;
  errorType?: string;
  errorMessage?: string;
  modelUsage?: Record<string, ModelUsage>;
}

function formatTokenCount(count: number): string {
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1)}k`;
}

export function SessionResult({
  costUsd,
  durationMs,
  turns,
  isError,
  errorType,
  errorMessage,
  modelUsage,
}: SessionResultProps) {
  const modelEntries = modelUsage
    ? Object.entries(modelUsage)
    : [];

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
      {isError && (
        <div className="mb-3 space-y-2">
          {errorType && (
            <Badge variant="destructive" className="text-xs">
              {errorType}
            </Badge>
          )}
          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {costUsd != null && (
          <span>Total cost: {formatCost(costUsd)}</span>
        )}
        {durationMs != null && (
          <span>Duration: {formatDuration(durationMs)}</span>
        )}
        {turns != null && (
          <span>Turns: {turns}</span>
        )}
      </div>
      {modelEntries.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {modelEntries.map(([model, usage]) => (
            <li key={model} className="flex gap-2">
              <span className="font-medium text-foreground/80">{model}</span>
              <span>
                {formatTokenCount(usage.inputTokens)} in /{" "}
                {formatTokenCount(usage.outputTokens)} out
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
