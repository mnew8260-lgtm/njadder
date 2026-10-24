import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema, hashPassword, createToken } from "@/lib/db";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { notifyNewUserPending } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 🛡️ Rate limit by IP (10 registrations/min)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`register:${ip}`, RATE_LIMITS.auth.max, RATE_LIMITS.auth.windowMs);
  if (!rl.allowed) {
    const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { ok: false, error: `محاولات كثيرة. حاول بعد ${retryAfter} ثانية.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const { username, password } = await req.json();

    // ─── Validation ───
    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: "اسم المستخدم وكلمة المرور مطلوبان" },
        { status: 400 }
      );
    }
    if (typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json(
        { ok: false, error: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل" },
        { status: 400 }
      );
    }
    if (username.length > 30) {
      return NextResponse.json(
        { ok: false, error: "اسم المستخدم طويل جداً (الحد 30 حرف)" },
        { status: 400 }
      );
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return NextResponse.json(
        { ok: false, error: "اسم المستخدم يجب أن يحتوي فقط على أحرف إنجليزية وأرقام و _ و -" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
        { status: 400 }
      );
    }

    await ensureSchema();

    // ─── First user becomes admin (auto-approved) ───
    const count = await sql`SELECT COUNT(*) as cnt FROM users`;
    const isFirst = Number((count as any[])[0].cnt) === 0;
    const role = isFirst ? "admin" : "user";
    const status = isFirst ? "approved" : "pending";

    const id = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const hash = await hashPassword(password);

    try {
      await sql`INSERT INTO users (id, username, password_hash, role, status) VALUES (${id}, ${username.trim()}, ${hash}, ${role}, ${status})`;
    } catch {
      return NextResponse.json(
        { ok: false, error: "اسم المستخدم مستخدم بالفعل" },
        { status: 400 }
      );
    }

    // ─── Send admin notification (best-effort, non-blocking) ───
    if (!isFirst) {
      notifyNewUserPending(username, id).catch(() => {
        // Silent fail — notifications should never block registration
      });
    }

    // ─── Issue session token ───
    const token = await createToken(id);
    const res = NextResponse.json({
      ok: true,
      user: { id, username, role, status },
      needsApproval: status === "pending",
    });
    res.cookies.set("njadder_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    return res;
  } catch (e: any) {
    console.error("[register] Error:", e);
    return NextResponse.json(
      { ok: false, error: "حدث خطأ غير متوقع. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}
