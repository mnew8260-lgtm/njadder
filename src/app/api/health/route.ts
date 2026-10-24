import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 🏥 Health Check Endpoint
// Returns: 200 OK if all systems healthy, 503 if any check fails
// Used by: PM2 watchdog, cron monitoring, external uptime monitors
export async function GET() {
  const start = Date.now();
  const checks: Record<string, any> = {};

  // ─── Check 1: Database connection ───
  try {
    const result = await sql`SELECT 1 AS ok, NOW() AS server_time`;
    checks.database = {
      ok: true,
      latency_ms: Date.now() - start,
      server_time: (result as any[])[0]?.server_time,
    };
  } catch (e: any) {
    checks.database = { ok: false, error: e.message?.substring(0, 100) };
  }

  // ─── Check 2: Environment variables ───
  checks.env = {
    ok: !!(process.env.DATABASE_URL && process.env.JWT_SECRET),
    has_database_url: !!process.env.DATABASE_URL,
    has_jwt_secret: !!process.env.JWT_SECRET,
    has_telegram_api: !!(process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH),
    node_env: process.env.NODE_ENV || "development",
  };

  // ─── Check 3: Process info ───
  checks.process = {
    ok: true,
    uptime_seconds: Math.round(process.uptime()),
    memory_mb: Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100,
    pid: process.pid,
    node_version: process.version,
  };

  // ─── Check 4: Counts (lightweight) ───
  try {
    const userCount = await sql`SELECT COUNT(*)::int AS n FROM users`;
    const accountCount = await sql`SELECT COUNT(*)::int AS n FROM telegram_accounts`;
    checks.counts = {
      ok: true,
      users: (userCount as any[])[0]?.n || 0,
      telegram_accounts: (accountCount as any[])[0]?.n || 0,
    };
  } catch (e: any) {
    checks.counts = { ok: false, error: e.message?.substring(0, 100) };
  }

  // ─── Overall status ───
  const allOk = Object.values(checks).every((c: any) => c?.ok === true);
  const status = allOk ? 200 : 503;
  const response = {
    ok: allOk,
    status: allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    version: "7.0.0",
    checks,
    total_latency_ms: Date.now() - start,
  };

  return NextResponse.json(response, { status });
}
