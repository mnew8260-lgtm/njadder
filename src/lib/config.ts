// ════════════════════════════════════════════════════════════
// NJADDER PRO v7.0 — Central Configuration
// ════════════════════════════════════════════════════════════
// Single source of truth for app-wide constants.
// Used by both server and client code.
// ════════════════════════════════════════════════════════════

export interface ChannelInfo {
  handle: string;
  url: string;
  label: string;
  type: "dev" | "support";
  icon: string;
}

/**
 * Official channels — hardcoded for client-side rendering
 * (NEXT_PUBLIC_* env vars would also work, but this is simpler & faster)
 */
export const CHANNELS: ChannelInfo[] = [
  {
    handle: "@njadder_pro",
    url: "https://t.me/njadder_pro",
    label: "@njadder_pro",
    type: "dev",
    icon: "⭐",
  },
  {
    handle: "@NMDDER_ch",
    url: "https://t.me/NMDDER_ch",
    label: "@NMDDER_ch",
    type: "dev",
    icon: "📢",
  },
  {
    handle: "@NMDDER_SUPPORT",
    url: "https://t.me/NMDDER_SUPPORT",
    label: "@NMDDER_SUPPORT",
    type: "support",
    icon: "💬",
  },
];

export const DEV_CHANNELS = CHANNELS.filter((c) => c.type === "dev");
export const SUPPORT_CHANNELS = CHANNELS.filter((c) => c.type === "support");

/**
 * App metadata
 */
export const APP = {
  name: "NJADDER PRO",
  version: "7.0.0",
  tagline: "أداة تيليجرام الذهبية",
  description: "118 أمر في 14 فئة — النسخة الاحترافية",
  domain: "njadder-app.tech",
  url: "https://njadder-app.tech",
};

/**
 * Login commands that don't require an existing account
 * (they create new sessions, so accountId is not needed)
 */
export const LOGIN_CREATE_ONLY = ["login", "loginbycsv", "logintypeone", "logintypetwo"] as const;

/**
 * Check if a command key is a "login create" command
 */
export function isLoginCreateCommand(cmdKey: string, cmdCategory: string): boolean {
  return cmdCategory === "login" && (LOGIN_CREATE_ONLY as readonly string[]).includes(cmdKey);
}

/**
 * Server-only config (read from env)
 */
export const SERVER_CONFIG = {
  get telegramApiId(): string {
    return process.env.TELEGRAM_API_ID || "35923747";
  },
  get telegramApiHash(): string {
    return process.env.TELEGRAM_API_HASH || "6de1cf34ed1e68d94615ba7b45391dde";
  },
  get jwtSecret(): string {
    return process.env.JWT_SECRET || "njadder-secret-2026";
  },
  get databaseUrl(): string | undefined {
    return process.env.DATABASE_URL;
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};
