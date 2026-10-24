import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema, hashPassword, verifyPassword, createToken } from "@/lib/db";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 🛡️ Rate limit by IP (10 attempts/min) — يحمي من brute force
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`login:${ip}`, RATE_LIMITS.auth.max, RATE_LIMITS.auth.windowMs);
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
    if (typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { ok: false, error: "بيانات غير صالحة" },
        { status: 400 }
      );
    }

    await ensureSchema();

    // ─── Lookup user ───
    const rows = await sql`SELECT * FROM users WHERE username = ${username.trim()}`;
    const user = (rows as any[])[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      // Same error message for both cases to prevent user enumeration
      return NextResponse.json(
        { ok: false, error: "بيانات الدخول غير صحيحة" },
        { status: 401 }
      );
    }

    // ─── Check approval status (admins skip) ───
    if (user.role !== "admin") {
      if (user.status === "pending") {
        return NextResponse.json({
          ok: false,
          error: "حسابك بانتظار موافقة المطور. حاول مرة أخرى لاحقاً.",
          needsApproval: true,
        }, { status: 403 });
      }
      if (user.status === "rejected") {
        return NextResponse.json({
          ok: false,
          error: "تم رفض حسابك من قبل المطور. تواصل مع الإدارة.",
          rejected: true,
        }, { status: 403 });
      }
    }

    // ─── Issue session token ───
    const token = await createToken(user.id);
    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status || "approved",
      },
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
    console.error("[login] Error:", e);
    return NextResponse.json(
      { ok: false, error: "حدث خطأ غير متوقع. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}

// DELETE — logout (clear cookie)
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("njadder_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return res;
}
