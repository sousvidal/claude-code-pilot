import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface RateLimitBannerProps {
  visible: boolean;
  onDismiss: () => void;
  timeoutMs?: number;
}

export function RateLimitBanner({
  visible,
  onDismiss,
  timeoutMs = 30_000,
}: RateLimitBannerProps) {
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(onDismiss, timeoutMs);
    return () => clearTimeout(id);
  }, [visible, onDismiss, timeoutMs]);

  if (!visible) return null;

  return (
    <div
      className="flex items-center justify-between gap-3 border-b border-accent-amber/30 bg-accent-amber/10 px-4 py-2"
      role="alert"
    >
      <div className="flex items-center gap-2 text-accent-amber">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">
          Rate limited — retrying...
        </span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
}
