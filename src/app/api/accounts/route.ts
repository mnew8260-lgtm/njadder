import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// تأمين مشترك: يجب أن يكون مُوافَق عليه
async function requireApproved() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 }), user: null };
  if (user.role !== "admin" && user.status !== "approved") {
    return { error: NextResponse.json({ ok: false, error: "Account pending approval", needsApproval: true }, { status: 403 }), user: null };
  }
  return { error: null, user };
}

// GET — list user's telegram accounts
export async function GET() {
  const { error, user } = await requireApproved();
  if (error || !user) return error;
  await ensureSchema();
  const rows = await sql`
    SELECT id, phone, full_name, username, status, created_at
    FROM telegram_accounts WHERE owner_id = ${user.id}
    ORDER BY created_at DESC
  `;
  return NextResponse.json({ ok: true, accounts: rows });
}

// POST — add a telegram account (login flow: send code → verify)
export async function POST(req: NextRequest) {
  const { error, user } = await requireApproved();
  if (error || !user) return error;
  try {
    const { action, phone, code, sessionString, phoneCodeHash, password, apiId, apiHash, session, name } = await req.json();
    await ensureSchema();

    const { sendCode, verifyCode, verify2FA, importSession } = await import("@/lib/telegram");

    if (action === "send_code") {
      if (!phone) return NextResponse.json({ ok: false, error: "phone required" }, { status: 400 });
      const result = await sendCode(phone, apiId ? Number(apiId) : undefined, apiHash);
      return NextResponse.json(result);
    }

    if (action === "verify_code") {
      const result = await verifyCode(phone, code, sessionString, phoneCodeHash, apiId ? Number(apiId) : undefined, apiHash);
      if (result.ok && result.sessionString) {
        const id = `tg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await sql`
          INSERT INTO telegram_accounts (id, owner_id, phone, session_string, api_id, api_hash, full_name, username, status)
          VALUES (${id}, ${user.id}, ${phone}, ${result.sessionString}, ${apiId || null}, ${apiHash || null}, ${result.user?.firstName || ""}, ${result.user?.username || ""}, 'active')
          ON CONFLICT (owner_id, phone) DO UPDATE SET session_string = EXCLUDED.session_string, status = 'active'
        `;
      }
      return NextResponse.json(result);
    }

    if (action === "verify_2fa") {
      const result = await verify2FA(password, sessionString, apiId ? Number(apiId) : undefined, apiHash);
      if (result.ok && result.sessionString) {
        const id = `tg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const u: any = result.user || {};
        await sql`
          INSERT INTO telegram_accounts (id, owner_id, phone, session_string, api_id, api_hash, full_name, username, status)
          VALUES (${id}, ${user.id}, ${phone || u.phone || ""}, ${result.sessionString}, ${apiId || null}, ${apiHash || null}, ${u.firstName || ""}, ${u.username || ""}, 'active')
          ON CONFLICT (owner_id, phone) DO UPDATE SET session_string = EXCLUDED.session_string, status = 'active'
        `;
      }
      return NextResponse.json(result);
    }

    // ─── استيراد جلسة من ملف أو نص ─────────────────────────
    if (action === "import_session") {
      if (!session) return NextResponse.json({ ok: false, error: "session string مطلوبة" }, { status: 400 });
      const result = await importSession(session, apiId ? Number(apiId) : undefined, apiHash);
      if (result.ok && result.sessionString) {
        const u: any = result.user || {};
        const accPhone = phone || u.phone || "";
        const id = `tg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await sql`
          INSERT INTO telegram_accounts (id, owner_id, phone, session_string, api_id, api_hash, full_name, username, status)
          VALUES (${id}, ${user.id}, ${accPhone}, ${result.sessionString}, ${apiId || null}, ${apiHash || null}, ${u.firstName || ""}, ${u.username || ""}, 'active')
          ON CONFLICT (owner_id, phone) DO UPDATE SET session_string = EXCLUDED.session_string, status = 'active', full_name = EXCLUDED.full_name, username = EXCLUDED.username
        `;
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// DELETE — remove account
export async function DELETE(req: NextRequest) {
  const { error, user } = await requireApproved();
  if (error || !user) return error;
  const { id } = await req.json();
  await sql`DELETE FROM telegram_accounts WHERE id = ${id} AND owner_id = ${user.id}`;
  return NextResponse.json({ ok: true });
}
