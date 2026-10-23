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

    // Check if any users exist — first user becomes admin
    const count = await sql`SELECT COUNT(*) as cnt FROM users`;
    const isFirst = Number((count as any[])[0].cnt) === 0;

    const rows = await sql`SELECT * FROM users WHERE username = ${username}`;
    const user = (rows as any[])[0];

    if (!user) {
      return NextResponse.json({ ok: false, error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ ok: false, error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    const token = await createToken(user.id);
    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, username: user.username, role: user.role },
    });
    res.cookies.set("njadder_session", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
