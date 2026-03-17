import { ExternalLink, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

const SUBSCRIPTION_LABELS: Record<string, string> = {
  max: "Max",
  pro: "Pro",
  free: "Free",
};

function utilizationColor(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 80) return "bg-orange-500";
  if (pct >= 60) return "bg-yellow-500";
  return "bg-green-500";
}

function formatResetsAt(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "resetting...";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return rh > 0 ? `resets in ${d}d ${rh}h` : `resets in ${d}d`;
  }
  if (h > 0) return `resets in ${h}h ${m}m`;
  return `resets in ${m}m`;
}

interface UsageRowProps {
  label: string;
  utilization: number;
  resetsAt?: string;
}

function UsageRow({ label, utilization, resetsAt }: UsageRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{utilization.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${utilizationColor(utilization)}`}
          style={{ width: `${Math.min(utilization, 100)}%` }}
        />
      </div>
      {resetsAt && (
        <p className="text-[10px] text-muted-foreground/60">{formatResetsAt(resetsAt)}</p>
      )}
    </div>
  );
}

export function StatusBar() {
  const { data: authStatus } = useQuery({
    queryKey: ["claude:authStatus"],
    queryFn: () => window.api.claude.authStatus(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: usage, isLoading, refetch } = useQuery({
    queryKey: ["claude:usageData"],
    queryFn: () => window.api.claude.usageData(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const subscriptionLabel = authStatus?.subscriptionType
    ? (SUBSCRIPTION_LABELS[authStatus.subscriptionType] ?? authStatus.subscriptionType)
    : null;

  // Derive top-level utilization for the badge (highest of the main periods)
  const maxUtil = Math.max(
    usage?.fiveHour?.utilization ?? 0,
    usage?.sevenDay?.utilization ?? 0,
  );

  return (
    <div className="flex h-[22px] shrink-0 items-center justify-end border-t border-border bg-card/60 px-3 text-[11px] text-muted-foreground">
      {subscriptionLabel && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-opacity hover:opacity-80"
              style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)", color: "var(--primary)" }}
            >
              {usage && maxUtil > 0 && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${utilizationColor(maxUtil)}`}
                />
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                {subscriptionLabel}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-72 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <span className="text-sm font-medium">Usage limits</span>
                {authStatus?.email && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{authStatus.email}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => void refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => window.api.shell.openExternal("https://claude.ai/settings/billing")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="px-4 py-3 space-y-4">
              {!usage && !isLoading && (
                <p className="text-[12px] text-muted-foreground text-center py-2">
                  Could not load usage data
                </p>
              )}

              {isLoading && (
                <p className="text-[12px] text-muted-foreground text-center py-2">Loading...</p>
              )}

              {usage && (
                <>
                  {usage.fiveHour && (
                    <UsageRow
                      label="5-hour window"
                      utilization={usage.fiveHour.utilization}
                      resetsAt={usage.fiveHour.resetsAt}
                    />
                  )}
                  {usage.sevenDay && (
                    <UsageRow
                      label="7-day window"
                      utilization={usage.sevenDay.utilization}
                      resetsAt={usage.sevenDay.resetsAt}
                    />
                  )}
                  {usage.sevenDayOpus && (
                    <UsageRow
                      label="7-day (Opus)"
                      utilization={usage.sevenDayOpus.utilization}
                      resetsAt={usage.sevenDayOpus.resetsAt}
                    />
                  )}
                  {usage.sevenDaySonnet && (
                    <UsageRow
                      label="7-day (Sonnet)"
                      utilization={usage.sevenDaySonnet.utilization}
                      resetsAt={usage.sevenDaySonnet.resetsAt}
                    />
                  )}

                  {usage.extraUsage?.isEnabled && (
                    <div className="pt-1 border-t border-border space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-muted-foreground">Extra usage</span>
                        <span className="font-medium">
                          ${((usage.extraUsage.usedCredits ?? 0) / 100).toFixed(2)}
                          {usage.extraUsage.monthlyLimit != null && (
                            <span className="text-muted-foreground font-normal"> / ${(usage.extraUsage.monthlyLimit / 100).toFixed(0)}</span>
                          )}
                        </span>
                      </div>
                      {usage.extraUsage.utilization != null && (
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${utilizationColor(usage.extraUsage.utilization)}`}
                            style={{ width: `${Math.min(usage.extraUsage.utilization, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
