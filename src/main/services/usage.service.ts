import { execFile } from "child_process";
import { logger } from "../lib/logger";

const log = logger.child({ service: "usage" });

const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const BETA_HEADER = "oauth-2025-04-20";
const USER_AGENT = "claude-code/0.0.0";

interface OAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  subscriptionType?: string;
}

interface RawUsagePeriod {
  utilization: number;
  resets_at?: string;
}

interface RawUsageResponse {
  five_hour?: RawUsagePeriod | null;
  seven_day?: RawUsagePeriod | null;
  seven_day_opus?: RawUsagePeriod | null;
  seven_day_sonnet?: RawUsagePeriod | null;
  extra_usage?: {
    is_enabled: boolean;
    monthly_limit?: number;
    used_credits?: number;
    utilization?: number;
  } | null;
}

export interface UsagePeriod {
  utilization: number;
  resetsAt?: string;
}

export interface UsageData {
  fiveHour?: UsagePeriod;
  sevenDay?: UsagePeriod;
  sevenDayOpus?: UsagePeriod;
  sevenDaySonnet?: UsagePeriod;
  extraUsage?: {
    isEnabled: boolean;
    monthlyLimit?: number;
    usedCredits?: number;
    utilization?: number;
  };
}

function readKeychainCredentials(): Promise<OAuthCredentials | null> {
  return new Promise((resolve) => {
    execFile(
      "/usr/bin/security",
      ["find-generic-password", "-s", "Claude Code-credentials", "-w"],
      { timeout: 5000 },
      (err, stdout) => {
        if (err) {
          log.debug({ err: err.message }, "keychain read failed");
          resolve(null);
          return;
        }
        try {
          const raw = JSON.parse(stdout.trim()) as Record<string, unknown>;
          const creds = (
            typeof raw.claudeAiOauth === "object" && raw.claudeAiOauth !== null
              ? raw.claudeAiOauth
              : raw
          ) as Record<string, unknown>;
          resolve({
            accessToken: String(creds.accessToken ?? ""),
            refreshToken: String(creds.refreshToken ?? ""),
            expiresAt: typeof creds.expiresAt === "number" ? creds.expiresAt : 0,
            subscriptionType:
              typeof creds.subscriptionType === "string" ? creds.subscriptionType : undefined,
          });
        } catch (e) {
          log.debug({ err: e }, "keychain parse failed");
          resolve(null);
        }
      },
    );
  });
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://console.anthropic.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch (e) {
    log.debug({ err: e }, "token refresh failed");
    return null;
  }
}

export async function getUsageData(): Promise<UsageData | null> {
  const creds = await readKeychainCredentials();
  if (!creds?.accessToken) return null;

  let token = creds.accessToken;

  // Refresh if expiring within 15 minutes
  const expiresInSec = creds.expiresAt - Date.now() / 1000;
  if (expiresInSec < 900) {
    const fresh = await refreshAccessToken(creds.refreshToken);
    if (fresh) token = fresh;
  }

  try {
    const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": BETA_HEADER,
        "User-Agent": USER_AGENT,
      },
    });
    if (!res.ok) {
      log.debug({ status: res.status }, "usage API returned error");
      return null;
    }

    const raw = (await res.json()) as RawUsageResponse;

    const mapPeriod = (p: RawUsagePeriod | null | undefined): UsagePeriod | undefined =>
      p ? { utilization: p.utilization, resetsAt: p.resets_at } : undefined;

    return {
      fiveHour: mapPeriod(raw.five_hour),
      sevenDay: mapPeriod(raw.seven_day),
      sevenDayOpus: mapPeriod(raw.seven_day_opus),
      sevenDaySonnet: mapPeriod(raw.seven_day_sonnet),
      extraUsage: raw.extra_usage
        ? {
            isEnabled: raw.extra_usage.is_enabled,
            monthlyLimit: raw.extra_usage.monthly_limit,
            usedCredits: raw.extra_usage.used_credits,
            utilization: raw.extra_usage.utilization,
          }
        : undefined,
    };
  } catch (e) {
    log.debug({ err: e }, "usage API fetch failed");
    return null;
  }
}
