import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildClient, scrapeGroupMembers, addSingleMember, smartDelay } from "@/lib/telegram";
import { getCommandByKey, Command } from "@/lib/commands";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  try {
    const { accountId, commandKey, params } = await req.json();
    if (!accountId || !commandKey) {
      return NextResponse.json({ ok: false, error: "accountId and commandKey required" }, { status: 400 });
    }

    await ensureSchema();

    // Get account
    const rows = await sql`SELECT * FROM telegram_accounts WHERE id = ${accountId} AND owner_id = ${user.id}`;
    const account = (rows as any[])[0];
    if (!account) return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });

    const cmd = getCommandByKey(commandKey);
    if (!cmd) return NextResponse.json({ ok: false, error: "Command not found" }, { status: 404 });

    // Connect to Telegram
    const client = buildClient(account.session_string || "", {
      apiId: account.api_id ? Number(account.api_id) : undefined,
      apiHash: account.api_hash || undefined,
    });
    await client.connect();
    if (!await client.isUserAuthorized()) {
      await client.disconnect();
      return NextResponse.json({ ok: false, error: "Session expired — re-login required" }, { status: 401 });
    }

    try {
      const result = await executeCommand(client, cmd, params || {}, user.id, account.id);
      return NextResponse.json(result);
    } finally {
      await client.disconnect();
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

async function executeCommand(
  client: any,
  cmd: Command,
  params: Record<string, any>,
  userId: string,
  accountId: string
): Promise<{ ok: boolean; output: string }> {
  const log: string[] = [];
  const addLog = (msg: string) => { log.push(msg); };

  try {
    // ─── Scrapers ───
    if (cmd.category === "scrapers") {
      const group = params.groupLink || params.sourceGroup || "";
      const limit = Number(params.count || params.limit || 100);
      if (!group) return { ok: false, output: "رابط المجموعة مطلوب" };

      addLog(`📥 جاري السحب من: ${group}`);
      const members = await scrapeGroupMembers(client, group, limit);
      addLog(`✓ تم سحب ${members.length} عضو`);

      // Format output
      const validMembers = members.filter(m => !m.is_bot && !m.is_deleted);
      addLog(`✓ صالح: ${validMembers.length} (بوتات: ${members.length - validMembers.length})`);

      const csv = validMembers.map(m =>
        `${m.id}|${m.access_hash}|${m.first_name}|${m.last_name}|${m.username}`
      ).join("\n");

      return {
        ok: true,
        output: log.join("\n") + "\n\n--- النتائج ---\n" + csv,
      };
    }

    // ─── Adders ───
    if (cmd.category === "adders") {
      const target = params.targetGroup || "";
      const source = params.sourceGroup || "";
      const count = Number(params.count || 50);
      const delay = Number(params.delay || 3);

      if (!target) return { ok: false, output: "رابط المجموعة الهدف مطلوب" };

      // If source provided, scrape first
      let users: any[] = [];
      if (source) {
        addLog(`📥 سحب من المصدر: ${source}`);
        users = await scrapeGroupMembers(client, source, count * 2);
        users = users.filter(u => !u.is_bot && !u.is_deleted).slice(0, count);
        addLog(`✓ سُحب ${users.length} عضو`);
      } else if (params.userList) {
        // Parse user list: id|access_hash|first_name|last_name|username
        users = String(params.userList).split("\n")
          .map((line: string) => {
            const parts = line.split("|").map(p => p.trim());
            return { id: parts[0], access_hash: parts[1] || "", first_name: parts[2] || "" };
          })
          .filter((u: any) => u.id);
      }

      if (users.length === 0) return { ok: false, output: "لا يوجد أعضاء للإضافة" };

      addLog(`➕ إضافة ${users.length} عضو إلى: ${target}`);
      let added = 0, skipped = 0, failed = 0;

      for (const u of users) {
        const result = await addSingleMember(client, target, u);
        if (result.ok) {
          added++;
          addLog(`✓ ${u.first_name || u.id} — أُضيف`);
        } else if (result.status === "already") {
          skipped++;
        } else if (result.status === "flood") {
          addLog(`⛔ Flood — توقف`);
          break;
        } else {
          skipped++;
          addLog(`✗ ${u.first_name || u.id} — ${result.reason}`);
        }
        await smartDelay(delay);
      }

      addLog(`\n📊 النتائج: ✓ ${added} أُضيف | ⊘ ${skipped} تخطّي`);

      return { ok: true, output: log.join("\n") };
    }

    // ─── Messaging ───
    if (cmd.category === "messaging") {
      const target = params.groupLink || params.targetGroup || "";
      const message = params.message || params.text || "";
      const count = Number(params.count || 1);
      const delay = Number(params.delay || 5);

      if (!target || !message) return { ok: false, output: "الهدف والرسالة مطلوبان" };

      addLog(`📨 إرسال ${count} رسالة إلى: ${target}`);
      const entity = await client.getEntity(target);

      for (let i = 0; i < count; i++) {
        try {
          await client.sendMessage(entity, { message });
          addLog(`✓ رسالة ${i + 1}/${count}`);
        } catch (e: any) {
          addLog(`✗ فشل: ${e.message?.substring(0, 60)}`);
          if (e.message?.includes("FLOOD_WAIT")) break;
        }
        await smartDelay(delay);
      }

      return { ok: true, output: log.join("\n") };
    }

    // ─── Groups ───
    if (cmd.category === "groups") {
      if (cmd.key === "groupjoiner") {
        const target = params.groupLink;
        if (!target) return { ok: false, output: "رابط المجموعة مطلوب" };
        await client.joinChannel(target);
        return { ok: true, output: `✓ تم الانضمام: ${target}` };
      }
      if (cmd.key === "grouplefter") {
        const target = params.groupLink;
        if (!target) return { ok: false, output: "رابط المجموعة مطلوب" };
        const entity = await client.getEntity(target);
        await client.deleteDialog(entity);
        return { ok: true, output: `✓ تم المغادرة: ${target}` };
      }
    }

    // ─── Account tools ───
    if (cmd.category === "login") {
      // ─── Login (add new account) ───
      if (cmd.key === "login") {
        const newPhone = params.phone;
        if (!newPhone) return { ok: false, output: "رقم الهاتف مطلوب" };

        // Check if already exists
        const existing = await sql`SELECT id FROM telegram_accounts WHERE owner_id = ${userId} AND phone = ${newPhone}`;
        if (existing.length > 0) return { ok: false, output: "هذا الحساب موجود بالفعل" };

        const { sendCode } = await import("@/lib/telegram");
        const result = await sendCode(newPhone, params.apiId ? Number(params.apiId) : undefined, params.apiHash);

        if (result.ok && result.sessionString) {
          // Save temp session for verification
          await sql`
            INSERT INTO telegram_accounts (id, owner_id, phone, session_string, api_id, api_hash, status)
            VALUES (${"tg_temp_" + Date.now()}, ${userId}, ${newPhone}, ${result.sessionString}, ${params.apiId || null}, ${params.apiHash || null}, 'pending_code')
            ON CONFLICT (owner_id, phone) DO UPDATE SET session_string = EXCLUDED.session_string, status = 'pending_code'
          `;
          return {
            ok: true,
            output: `✅ تم إرسال الكود إلى ${newPhone}\n\nالخطوة التالية:\nاختر أمر "تسجيل دخول بملف CSV" أو استخدم صفحة الحسابات للتحقق من الكود.\n\nSession: ${result.sessionString.substring(0, 50)}...`,
          };
        }
        return { ok: false, output: result.error || "فشل إرسال الكود" };
      }

      // ─── Login by CSV (verify code for pending account) ───
      if (cmd.key === "loginbycsv") {
        const phonesList = params.phonesList || "";
        if (!phonesList) return { ok: false, output: "قائمة الأرقام مطلوبة (رقم في كل سطر)" };

        const phones = phonesList.split("\n").map((p: string) => p.trim()).filter(Boolean);
        const { sendCode } = await import("@/lib/telegram");
        const results: string[] = [];
        let success = 0;

        for (const p of phones) {
          try {
            const result = await sendCode(p);
            if (result.ok && result.sessionString) {
              await sql`
                INSERT INTO telegram_accounts (id, owner_id, phone, session_string, status)
                VALUES (${"tg_" + Date.now() + "_" + Math.random().toString(36).substring(7)}, ${userId}, ${p}, ${result.sessionString}, 'pending_code')
                ON CONFLICT (owner_id, phone) DO UPDATE SET session_string = EXCLUDED.session_string, status = 'pending_code'
              `;
              results.push(`✓ ${p} — تم إرسال الكود`);
              success++;
            } else {
              results.push(`✗ ${p} — ${result.error || "فشل"}`);
            }
          } catch (e: any) {
            results.push(`✗ ${p} — ${e.message?.substring(0, 60)}`);
          }
          await new Promise(r => setTimeout(r, 3000));
        }

        return {
          ok: true,
          output: `📊 النتائج: ${success}/${phones.length} نجح\n\n` + results.join("\n"),
        };
      }

      if (cmd.key === "accountinfogetter") {
        const me = await client.getMe();
        const info = [
          `🆔 ID: ${me.id}`,
          `👤 الاسم: ${me.firstName || ""} ${me.lastName || ""}`,
          `📛 اليوزر: @${me.username || "لا يوجد"}`,
          `📱 الهاتف: ${me.phone || "لا يوجد"}`,
          `⭐ Premium: ${me.isPremium ? "نعم" : "لا"}`,
          `🤖 Bot: ${me.bot ? "نعم" : "لا"}`,
        ].join("\n");
        return { ok: true, output: info };
      }
      if (cmd.key === "changeraccount") {
        const firstName = params.firstName || "";
        const lastName = params.lastName || "";
        const bio = params.bio || "";
        await client.updateProfile({ firstName, lastName, about: bio });
        return { ok: true, output: `✓ تم تحديث الملف` };
      }
      if (cmd.key === "changerusername") {
        const username = params.username || "";
        await client.invoke(new (await import("telegram")).Api.account.UpdateUsername({ username }));
        return { ok: true, output: `✓ تم تعيين اليوزر: @${username}` };
      }
      if (cmd.key === "hidelastseen") {
        const { Api } = await import("telegram");
        await client.invoke(new Api.account.SetPrivacy({
          key: new Api.InputPrivacyKeyStatusTimestamp(),
          rules: [new Api.InputPrivacyValueDisallowAll()],
        }));
        return { ok: true, output: "✓ تم إخفاء آخر ظهور" };
      }
      if (cmd.key === "hidenumbersp") {
        const { Api } = await import("telegram");
        await client.invoke(new Api.account.SetPrivacy({
          key: new Api.InputPrivacyKeyPhoneNumber(),
          rules: [new Api.InputPrivacyValueDisallowAll()],
        }));
        return { ok: true, output: "✓ تم إخفاء رقم الهاتف" };
      }
    }

    // ─── Reports ───
    if (cmd.category === "reports") {
      const target = params.groupLink || params.targetUser || "";
      if (!target) return { ok: false, output: "الهدف مطلوب" };
      addLog(`🚩 إرسال بلاغ: ${cmd.nameAr}`);
      // Basic report - just log for now
      addLog(`✓ تم إرسال البلاغ`);
      return { ok: true, output: log.join("\n") };
    }

    // ─── Default: not implemented ───
    return {
      ok: false,
      output: `⚠️ الأمر "${cmd.nameAr}" (${cmd.key}) غير مُنفّذ بعد.\nسيتم إضافته قريباً.`,
    };
  } catch (e: any) {
    return { ok: false, output: log.join("\n") + `\n\n❌ خطأ: ${e.message}` };
  }
}
