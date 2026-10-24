import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// GET — قائمة كل الحسابات مع حالتها الكاملة (للاختيار في UI)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  try {
    await ensureSchema();
    const rows = await sql`
      SELECT id, phone, full_name, username, status, api_id, api_hash, created_at
      FROM telegram_accounts
      WHERE owner_id = ${user.id}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      ok: true,
      accounts: rows,
      count: (rows as any[]).length,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// POST — bulk login (تسجيل دخول جماعي)
// body: { action: "bulk_send_code", phones: ["+123...", "+456..."] }
// body: { action: "bulk_verify", items: [{ phone, code, sessionString, phoneCodeHash }] }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { action } = body;
    await ensureSchema();

    const { sendCode, verifyCode, verify2FA } = await import("@/lib/telegram");

    // ─── تسجيل دخول جماعي: إرسال كود لكل رقم ───
    if (action === "bulk_send_code") {
      const phones: string[] = body.phones || [];
      if (!phones.length) {
        return NextResponse.json({ ok: false, error: "phones required" }, { status: 400 });
      }

      const results: any[] = [];
      let success = 0;
      for (const phone of phones) {
        const trimmed = phone.trim();
        if (!trimmed) continue;
        try {
          const result = await sendCode(trimmed);
          if (result.ok) {
            results.push({
              phone: trimmed,
              ok: true,
              sessionString: result.sessionString,
              phoneCodeHash: result.phoneCodeHash,
            });
            success++;
          } else {
            results.push({ phone: trimmed, ok: false, error: result.error });
          }
        } catch (e: any) {
          results.push({ phone: trimmed, ok: false, error: e.message?.substring(0, 80) });
        }
        // تأخير 5 ثواني بين كل رقم لتفادي Flood
        await new Promise(r => setTimeout(r, 5000));
      }

      return NextResponse.json({
        ok: true,
        success,
        total: phones.length,
        results,
      });
    }

    // ─── تسجيل دخول جماعي: التحقق من كل كود ───
    if (action === "bulk_verify") {
      const items: Array<{
        phone: string;
        code: string;
        sessionString: string;
        phoneCodeHash: string;
        password?: string;
      }> = body.items || [];

      if (!items.length) {
        return NextResponse.json({ ok: false, error: "items required" }, { status: 400 });
      }

      const results: any[] = [];
      let success = 0;

      for (const item of items) {
        try {
          // محاولة verify_code أولاً
          const codeResult = await verifyCode(
            item.phone,
            item.code,
            item.sessionString,
            item.phoneCodeHash
          );

          if (codeResult.ok) {
            // حفظ في DB
            const id = `tg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            await sql`
              INSERT INTO telegram_accounts (id, owner_id, phone, session_string, full_name, username, status)
              VALUES (${id}, ${user.id}, ${item.phone}, ${codeResult.sessionString},
                ${codeResult.user?.firstName || ""}, ${codeResult.user?.username || ""}, 'active')
              ON CONFLICT (owner_id, phone) DO UPDATE SET
                session_string = EXCLUDED.session_string,
                status = 'active',
                full_name = EXCLUDED.full_name,
                username = EXCLUDED.username
            `;
            results.push({ phone: item.phone, ok: true, user: codeResult.user });
            success++;
          } else if (codeResult.need2FA && item.password) {
            // محاولة 2FA
            const faResult = await verify2FA(item.password, item.sessionString);
            if (faResult.ok) {
              const id = `tg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
              await sql`
                INSERT INTO telegram_accounts (id, owner_id, phone, session_string, full_name, username, status)
                VALUES (${id}, ${user.id}, ${item.phone}, ${faResult.sessionString},
                  ${faResult.user?.firstName || ""}, ${faResult.user?.username || ""}, 'active')
                ON CONFLICT (owner_id, phone) DO UPDATE SET
                  session_string = EXCLUDED.session_string,
                  status = 'active'
              `;
              results.push({ phone: item.phone, ok: true, user: faResult.user, used2FA: true });
              success++;
            } else {
              results.push({ phone: item.phone, ok: false, error: faResult.error || "2FA failed" });
            }
          } else if (codeResult.need2FA) {
            results.push({ phone: item.phone, ok: false, error: "2FA required", need2FA: true });
          } else {
            results.push({ phone: item.phone, ok: false, error: codeResult.error });
          }
        } catch (e: any) {
          results.push({ phone: item.phone, ok: false, error: e.message?.substring(0, 80) });
        }
        await new Promise(r => setTimeout(r, 2000));
      }

      return NextResponse.json({
        ok: true,
        success,
        total: items.length,
        results,
      });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
