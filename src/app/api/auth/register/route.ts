import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema, hashPassword, createToken } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ ok: false, error: "اسم المستخدم وكلمة المرور مطلوبان" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ ok: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
    }

    await ensureSchema();

    // First user becomes admin
    const count = await sql`SELECT COUNT(*) as cnt FROM users`;
    const isFirst = Number((count as any[])[0].cnt) === 0;
    const role = isFirst ? "admin" : "user";

    const id = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const hash = await hashPassword(password);

    try {
      await sql`INSERT INTO users (id, username, password_hash, role) VALUES (${id}, ${username}, ${hash}, ${role})`;
    } catch {
      return NextResponse.json({ ok: false, error: "اسم المستخدم مستخدم بالفعل" }, { status: 400 });
    }

    const token = await createToken(id);
    const res = NextResponse.json({
      ok: true,
      user: { id, username, role },
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
