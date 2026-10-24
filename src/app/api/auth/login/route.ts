import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema, hashPassword, verifyPassword, createToken } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ ok: false, error: "اسم المستخدم وكلمة المرور مطلوبان" }, { status: 400 });
    }

    await ensureSchema();

    const rows = await sql`SELECT * FROM users WHERE username = ${username}`;
    const user = (rows as any[])[0];

    if (!user) {
      return NextResponse.json({ ok: false, error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ ok: false, error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    // التحقق من حالة الموافقة (الأدمن يتخطّى هذا الفحص)
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

    const token = await createToken(user.id);
    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, username: user.username, role: user.role, status: user.status || "approved" },
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
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
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
