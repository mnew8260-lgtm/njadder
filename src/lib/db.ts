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
  initialized = true;
}

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
