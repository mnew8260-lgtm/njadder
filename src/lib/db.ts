import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

export const sql = postgres(DATABASE_URL, {
  ssl: "prefer",
  max: 5,
  idle_timeout: 30,
  connect_timeout: 60,
  max_lifetime: 300,
  prepare: false,
  onnotice: () => {},
});

// ─── Schema initialization ───────────────────────────────
let initialized = false;

export async function ensureSchema() {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      subscription_plan TEXT DEFAULT 'free',
      subscription_expires BIGINT DEFAULT 0,
      trial_used BOOLEAN DEFAULT FALSE,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS telegram_accounts (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      phone TEXT NOT NULL,
      session_string TEXT,
      api_id TEXT,
      api_hash TEXT,
      status TEXT DEFAULT 'idle',
      full_name TEXT,
      username TEXT,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
      UNIQUE(owner_id, phone)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS proxies (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      type TEXT DEFAULT 'socks5',
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      username TEXT,
      password TEXT,
      is_working BOOLEAN DEFAULT TRUE,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS api_pool (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      api_id TEXT NOT NULL,
      api_hash TEXT NOT NULL,
      label TEXT,
      is_working BOOLEAN DEFAULT TRUE,
      used_count INTEGER DEFAULT 0,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
      UNIQUE(owner_id, api_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY,
      owner_id TEXT,
      action TEXT,
      detail TEXT,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_tg_accounts_owner ON telegram_accounts(owner_id)`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free'`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires BIGINT DEFAULT 0`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE`;
  // ─── Approval system column ───
  // status: 'pending' (بانتظار موافقة المطور), 'approved' (مقبول), 'rejected' (مرفوض)
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`;
  await sql`
    CREATE TABLE IF NOT EXISTS usage_log (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      scrape_count INTEGER DEFAULT 0,
      add_count INTEGER DEFAULT 0,
      message_count INTEGER DEFAULT 0,
      UNIQUE(user_id, date)
    )
  `;
  // ─── Blacklist table ───
  await sql`
    CREATE TABLE IF NOT EXISTS blacklist (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      telegram_id TEXT NOT NULL,
      reason TEXT,
      added_by TEXT,
      full_name TEXT,
      username TEXT,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
      UNIQUE(owner_id, telegram_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_blacklist_owner ON blacklist(owner_id)`;
  initialized = true;
}

// ─── Subscription system ─────────────────────────────────
export type PlanType = "free" | "pro" | "premium";

export const PLAN_CONFIG: Record<PlanType, {
  name: string; price: number; duration: number; icon: string;
  limits: { accounts: number; scrape: number; add: number; message: number };
  features: string[];
}> = {
  free: {
    name: "مجاني", price: 0, duration: 0, icon: "🆓",
    limits: { accounts: 3, scrape: 100, add: 50, message: 30 },
    features: ["3 حسابات تيليجرام", "100 سحب/يوم", "50 إضافة/يوم", "30 رسالة/يوم"],
  },
  pro: {
    name: "احترافي", price: 50, duration: 30, icon: "⚡",
    limits: { accounts: 10, scrape: 1000, add: 500, message: 200 },
    features: ["10 حسابات", "1000 سحب/يوم", "500 إضافة/يوم", "200 رسالة/يوم", "API Rotation", "أولوية الدعم"],
  },
  premium: {
    name: "بريميوم", price: 100, duration: 30, icon: "👑",
    limits: { accounts: 999, scrape: 999999, add: 999999, message: 999999 },
    features: ["حسابات غير محدودة", "كل شيء غير محدود", "API Rotation", "Device Rotation", "دعم 24/7"],
  },
};

export const SubscriptionService = {
  async getPlan(userId: string): Promise<{ plan: PlanType; active: boolean; expires: number }> {
    await ensureSchema();
    const rows = await sql`SELECT subscription_plan, subscription_expires FROM users WHERE id = ${userId}`;
    const u = (rows as any[])[0];
    if (!u) return { plan: "free", active: false, expires: 0 };
    const expires = Number(u.subscription_expires || 0);
    const active = expires === 0 ? false : expires > Date.now();
    return {
      plan: (active ? u.subscription_plan : "free") as PlanType,
      active,
      expires,
    };
  },

  async setPlan(userId: string, plan: PlanType, days: number): Promise<void> {
    await ensureSchema();
    const expires = days > 0 ? Date.now() + days * 86400000 : 0;
    await sql`UPDATE users SET subscription_plan = ${plan}, subscription_expires = ${expires} WHERE id = ${userId}`;
  },

  async checkLimit(userId: string, op: "scrape" | "add" | "message"): Promise<{ allowed: boolean; used: number; limit: number }> {
    const { plan } = await this.getPlan(userId);
    const limits = PLAN_CONFIG[plan].limits;
    const today = new Date().toISOString().split("T")[0];
    const rows = await sql`SELECT * FROM usage_log WHERE user_id = ${userId} AND date = ${today}`;
    const u = (rows as any[])[0] || {};
    const used = Number(u[`${op}_count`] || 0);
    const limit = (limits as any)[op] as number;
    return { allowed: used < limit, used, limit };
  },

  async incrementUsage(userId: string, op: "scrape" | "add" | "message", count: number = 1): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    const col = `${op}_count`;
    await sql`
      INSERT INTO usage_log (user_id, date, ${sql(col)})
      VALUES (${userId}, ${today}, ${count})
      ON CONFLICT (user_id, date) DO UPDATE SET ${sql(col)} = usage_log.${sql(col)} + ${count}
    `;
  },

  async getUsage(userId: string): Promise<{ scrape: number; add: number; message: number }> {
    const today = new Date().toISOString().split("T")[0];
    const rows = await sql`SELECT * FROM usage_log WHERE user_id = ${userId} AND date = ${today}`;
    const u = (rows as any[])[0] || {};
    return {
      scrape: Number(u.scrape_count || 0),
      add: Number(u.add_count || 0),
      message: Number(u.message_count || 0),
    };
  },

  async getAllUsers(): Promise<any[]> {
    await ensureSchema();
    return await sql`
      SELECT id, username, role, status, subscription_plan, subscription_expires, created_at
      FROM users ORDER BY created_at DESC
    ` as any[];
  },
};

// ─── Blacklist service ───────────────────────────────────
export const BlacklistService = {
  // قائمة كل المعرّفات المحظورة لهذا المستخدم
  async list(userId: string): Promise<any[]> {
    await ensureSchema();
    return await sql`
      SELECT id, telegram_id, reason, added_by, full_name, username, created_at
      FROM blacklist WHERE owner_id = ${userId}
      ORDER BY created_at DESC
    ` as any[];
  },

  // مجموعة معرّفات (Set) للاستخدام السريع أثناء الإضافة
  async idSet(userId: string): Promise<Set<string>> {
    const rows = await this.list(userId);
    return new Set(rows.map((r: any) => String(r.telegram_id)));
  },

  // إضافة معرّف واحد للقائمة السوداء
  async add(userId: string, telegramId: string, opts?: { reason?: string; addedBy?: string; fullName?: string; username?: string }): Promise<{ ok: boolean; error?: string }> {
    await ensureSchema();
    const id = `bl_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    try {
      await sql`
        INSERT INTO blacklist (id, owner_id, telegram_id, reason, added_by, full_name, username)
        VALUES (${id}, ${userId}, ${String(telegramId)}, ${opts?.reason || null}, ${opts?.addedBy || "manual"}, ${opts?.fullName || null}, ${opts?.username || null})
        ON CONFLICT (owner_id, telegram_id) DO UPDATE SET reason = EXCLUDED.reason, full_name = EXCLUDED.full_name, username = EXCLUDED.username
      `;
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },

  // إضافة جماعية من نص (سطر بمعرّف)
  async addBulk(userId: string, text: string, reason?: string): Promise<{ added: number; skipped: number; errors: string[] }> {
    const lines = (text || "").split("\n").map(l => l.trim()).filter(Boolean);
    let added = 0, skipped = 0;
    const errors: string[] = [];
    for (const line of lines) {
      // يدعم صيغ: 12345 / 12345,ahmed / 12345;@user / "12345","name"
      let tid = line;
      let name = "";
      let uname = "";
      if (line.includes(",") || line.includes(";")) {
        const parts = line.split(/[,;]/).map(p => p.trim());
        tid = parts[0];
        if (parts[1]) {
          if (parts[1].startsWith("@")) uname = parts[1];
          else name = parts[1];
        }
      } else if (line.includes('"')) {
        const m = line.match(/"?\s*(\d+)\s*"?\s*,?\s*"?\s*([^"]*)/);
        if (m) { tid = m[1]; name = m[2]; }
      }
      // تنظيف: فقط الأرقام
      tid = tid.replace(/[^\d-]/g, "");
      if (!tid) { skipped++; continue; }
      const r = await this.add(userId, tid, { reason, addedBy: "bulk", fullName: name, username: uname });
      if (r.ok) added++; else errors.push(`${tid}: ${r.error}`);
    }
    return { added, skipped, errors };
  },

  // حذف معرّف من القائمة
  async remove(userId: string, id: string): Promise<void> {
    await sql`DELETE FROM blacklist WHERE id = ${id} AND owner_id = ${userId}`;
  },

  // حذف كل القائمة
  async clear(userId: string): Promise<number> {
    const r = await sql`DELETE FROM blacklist WHERE owner_id = ${userId} RETURNING id`;
    return (r as any[]).length;
  },

  // عدد العناصر
  async count(userId: string): Promise<number> {
    const rows = await sql`SELECT COUNT(*)::int AS n FROM blacklist WHERE owner_id = ${userId}`;
    return Number((rows as any[])[0]?.n || 0);
  },
};

// ─── Auth helpers ────────────────────────────────────────
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "njadder-secret-2026");

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.sub || null;
  } catch {
    return null;
  }
}
