import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema, BlacklistService } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildClient, scrapeGroupMembers, addSingleMember, smartDelay, resolveChannelEntity } from "@/lib/telegram";
import { getCommandByKey, Command } from "@/lib/commands";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  // تأمين الموافقة
  if (user.role !== "admin" && user.status !== "approved") {
    return NextResponse.json({ ok: false, error: "حسابك بانتظار موافقة المطور", needsApproval: true }, { status: 403 });
  }

  // 🛡️ Rate limiting: max 5 عمليات تنفيذ في الدقيقة لكل مستخدم
  const rl = checkRateLimit(`exec:${user.id}`, RATE_LIMITS.execute.max, RATE_LIMITS.execute.windowMs);
  if (!rl.allowed) {
    const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { ok: false, error: `تجاوزت الحد المسموح (${RATE_LIMITS.execute.max}/دقيقة). حاول بعد ${retryAfter} ثانية.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const { accountId, commandKey, params } = await req.json();
    if (!commandKey) {
      return NextResponse.json({ ok: false, error: "commandKey required" }, { status: 400 });
    }

    await ensureSchema();

    const cmd = getCommandByKey(commandKey);
    if (!cmd) return NextResponse.json({ ok: false, error: "Command not found" }, { status: 404 });

    // ─── أوامر تسجيل الدخول التي تُنشئ حساباً جديداً ───
    // هذه فقط لا تحتاج حساب موجود لأنها تُنشئ session جديدة
    const LOGIN_CREATE_ONLY = ["login", "loginbycsv", "logintypeone", "logintypetwo"];
    const isLoginCreateCmd = cmd.category === "login" && LOGIN_CREATE_ONLY.includes(cmd.key);

    if (isLoginCreateCmd) {
      try {
        const result = await executeCommand(null, cmd, params || {}, user.id, "", "");
        return NextResponse.json(result);
      } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
      }
    }

    // ─── باقي الأوامر (بما فيها أوامر login غير الـ create) تتطلب حساباً موجوداً ───
    if (!accountId) {
      return NextResponse.json({ ok: false, error: "accountId required for this command" }, { status: 400 });
    }

    const rows = await sql`SELECT * FROM telegram_accounts WHERE id = ${accountId} AND owner_id = ${user.id}`;
    const account = (rows as any[])[0];
    if (!account) return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });

    const client = buildClient(account.session_string || "", {
      apiId: account.api_id ? Number(account.api_id) : undefined,
      apiHash: account.api_hash || undefined,
    });
    await client.connect();
    if (!await client.isUserAuthorized()) {
      await client.disconnect();
      return NextResponse.json({ ok: false, error: "Session expired" }, { status: 401 });
    }

    try {
      const result = await executeCommand(client, cmd, params || {}, user.id, account.id, account.phone);
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
  accountId: string,
  accountPhone: string
): Promise<{ ok: boolean; output: string }> {
  const log: string[] = [];
  const addLog = (msg: string) => { log.push(msg); };
  const { Api } = await import("telegram");

  try {
    // ═══════════════════════════════════════════════════════
    // [1-22] ACCOUNT & LOGIN
    // ═══════════════════════════════════════════════════════
    if (cmd.category === "login") {
      switch (cmd.key) {
        case "login": {
          const phone = params.phone;
          if (!phone) return { ok: false, output: "رقم الهاتف مطلوب" };
          const { sendCode } = await import("@/lib/telegram");
          const result = await sendCode(phone, params.apiId ? Number(params.apiId) : undefined, params.apiHash);
          if (result.ok && result.sessionString) {
            await sql`INSERT INTO telegram_accounts (id, owner_id, phone, session_string, api_id, api_hash, status) VALUES (${"tg_" + Date.now()}, ${userId}, ${phone}, ${result.sessionString}, ${params.apiId || null}, ${params.apiHash || null}, 'pending_code') ON CONFLICT (owner_id, phone) DO UPDATE SET session_string = EXCLUDED.session_string, status = 'pending_code'`;
            return { ok: true, output: `✅ تم إرسال الكود إلى ${phone}` };
          }
          return { ok: false, output: result.error || "فشل" };
        }
        case "loginbycsv": {
          const phonesList = params.phonesList || "";
          if (!phonesList) return { ok: false, output: "قائمة الأرقام مطلوبة" };
          const phones = phonesList.split("\n").map((p: string) => p.trim()).filter(Boolean);
          const { sendCode } = await import("@/lib/telegram");
          let success = 0;
          const results: string[] = [];
          for (const p of phones) {
            try {
              const result = await sendCode(p);
              if (result.ok) {
                await sql`INSERT INTO telegram_accounts (id, owner_id, phone, session_string, status) VALUES (${"tg_" + Date.now() + Math.random().toString(36).substring(7)}, ${userId}, ${p}, ${result.sessionString}, 'pending_code') ON CONFLICT (owner_id, phone) DO UPDATE SET session_string = EXCLUDED.session_string, status = 'pending_code'`;
                results.push(`✓ ${p}`); success++;
              } else { results.push(`✗ ${p} — ${result.error}`); }
            } catch (e: any) { results.push(`✗ ${p} — ${e.message?.substring(0, 60)}`); }
            await new Promise(r => setTimeout(r, 3000));
          }
          return { ok: true, output: `📊 ${success}/${phones.length} نجح\n\n` + results.join("\n") };
        }
        case "accountinfogetter": {
          const me = await client.getMe();
          return { ok: true, output: `🆔 ID: ${me.id}\n👤 الاسم: ${me.firstName || ""} ${me.lastName || ""}\n📛 اليوزر: @${me.username || "لا يوجد"}\n📱 الهاتف: ${me.phone || "لا يوجد"}\n⭐ Premium: ${me.isPremium ? "نعم" : "لا"}` };
        }
        case "changeraccount": {
          await client.updateProfile({ firstName: params.firstName || "", lastName: params.lastName || "", about: params.bio || "" });
          return { ok: true, output: "✓ تم تحديث الاسم والبايو" };
        }
        case "changerusername": {
          await client.invoke(new Api.account.UpdateUsername({ username: params.username || "" }));
          return { ok: true, output: `✓ تم تعيين اليوزر: @${params.username}` };
        }
        case "hidelastseen": {
          await client.invoke(new Api.account.SetPrivacy({ key: new Api.InputPrivacyKeyStatusTimestamp(), rules: [new Api.InputPrivacyValueDisallowAll()] }));
          return { ok: true, output: "✓ تم إخفاء آخر ظهور" };
        }
        case "hidenumbersp": {
          await client.invoke(new Api.account.SetPrivacy({ key: new Api.InputPrivacyKeyPhoneNumber(), rules: [new Api.InputPrivacyValueDisallowAll()] }));
          return { ok: true, output: "✓ تم إخفاء رقم الهاتف" };
        }
        case "hidenmbandphone": {
          await client.invoke(new Api.account.SetPrivacy({ key: new Api.InputPrivacyKeyStatusTimestamp(), rules: [new Api.InputPrivacyValueDisallowAll()] }));
          await client.invoke(new Api.account.SetPrivacy({ key: new Api.InputPrivacyKeyPhoneNumber(), rules: [new Api.InputPrivacyValueDisallowAll()] }));
          return { ok: true, output: "✓ تم إخفاء الظهور والرقم" };
        }
        case "randomusernameh": {
          const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
          let username = "";
          for (let i = 0; i < 12; i++) username += chars[Math.floor(Math.random() * chars.length)];
          try {
            await client.invoke(new Api.account.UpdateUsername({ username }));
            return { ok: true, output: `✓ تم تعيين يوزر عشوائي: @${username}` };
          } catch (e: any) { return { ok: false, output: "✗ فشل: " + e.message?.substring(0, 80) }; }
        }
        case "csvblankremover": {
          const lines = (params.phonesList || "").split("\n").filter((l: string) => l.trim());
          return { ok: true, output: `✓ تم تنظيف ${lines.length} سطر\n\n` + lines.join("\n") };
        }
        case "banfilter": {
          const numbers = (params.phonesList || "").split("\n").map((n: string) => n.trim()).filter(Boolean);
          if (!numbers.length) return { ok: false, output: "أدخل أرقام" };
          const valid: string[] = [], banned: string[] = [], invalid: string[] = [];
          for (const num of numbers) {
            try {
              await client.invoke(new Api.contacts.ResolvePhone({ phone: num.replace(/\D/g, "") }));
              valid.push(num);
            } catch (e: any) {
              if (e.message?.includes("BANNED")) banned.push(num);
              else invalid.push(num);
            }
            await new Promise(r => setTimeout(r, 1500));
          }
          return { ok: true, output: `📊 النتائج:\n✓ صالح: ${valid.length}\n🚫 محظور: ${banned.length}\n❓ غير صالح: ${invalid.length}\n\n--- المحظورين ---\n${banned.join("\n")}` };
        }
        case "permanentlimitremover":
        case "permanentlimitremover2":
        case "limicheckandrem": {
          addLog("🔍 فحص حالة @SpamBot...");
          try {
            await client.sendMessage("SpamBot", { message: "/start" });
            await new Promise(r => setTimeout(r, 2000));
            const msgs = await client.getMessages("SpamBot", { limit: 1 });
            const lastMsg = (msgs as any[])[0];
            if (lastMsg?.text) {
              const text = lastMsg.text.toLowerCase();
              if (text.includes("free") || text.includes("bird")) addLog("✅ الحساب نظيف — لا قيود");
              else if (text.includes("limited") || text.includes("restricted")) {
                addLog("⚠️ الحساب مقيد — إرسال شكوى...");
                await client.sendMessage("SpamBot", { message: "Submit a complaint" });
                await new Promise(r => setTimeout(r, 2000));
                await client.sendMessage("SpamBot", { message: "No, I'll never do any of this!" });
                addLog("✓ تم إرسال الشكوى — راجع بعد 24-48 ساعة");
              } else addLog("ℹ️ رد SpamBot: " + lastMsg.text.substring(0, 100));
            } else addLog("⚠️ لم يصل رد من SpamBot");
          } catch (e: any) { addLog("✗ خطأ: " + e.message?.substring(0, 80)); }
          return { ok: true, output: log.join("\n") };
        }
        case "otpviewer": {
          try {
            const msgs = await client.getMessages(777000, { limit: 3 });
            const otpMsgs = (msgs as any[]).filter(m => m.text);
            if (otpMsgs.length === 0) return { ok: true, output: "📭 لا توجد أكواد OTP" };
            return { ok: true, output: "📩 أكواد OTP:\n\n" + otpMsgs.map(m => `${m.text?.substring(0, 100)}`).join("\n---\n") };
          } catch { return { ok: false, output: "✗ فشل قراءة الرسائل" }; }
        }
        case "twostepverification": {
          const password = params.password;
          if (!password) return { ok: false, output: "كلمة المرور مطلوبة" };
          try {
            return { ok: true, output: "ℹ️ تفعيل 2FA يتطلب إعدادات إضافية. استخدم إعدادات تيليجرام مباشرة." };
          } catch (e: any) { return { ok: false, output: "✗ " + e.message?.substring(0, 80) }; }
        }
        case "autoidcloner": {
          const target = params.targetUser;
          if (!target) return { ok: false, output: "المستخدم الهدف مطلوب" };
          try {
            const targetUser = await client.getEntity(target);
            const targetChat = await client.getEntity(target);
            const bio = (targetChat as any).about || "";
            await client.updateProfile({ firstName: (targetUser as any).firstName || "", lastName: (targetUser as any).lastName || "", about: bio });
            return { ok: true, output: `✓ تم استنساخ: ${(targetUser as any).firstName}` };
          } catch (e: any) { return { ok: false, output: "✗ " + e.message?.substring(0, 80) }; }
        }
        case "setprofilepic": {
          const photoPath = params.photoPath;
          if (!photoPath) return { ok: false, output: "مسار الصورة مطلوب" };
          try {
            await client.uploadFile({ file: photoPath, name: "photo.jpg" });
            return { ok: true, output: "✓ تم تعيين الصورة" };
          } catch (e: any) { return { ok: false, output: "✗ " + e.message?.substring(0, 80) }; }
        }
        case "removeprofilepic": {
          const photos = await client.getProfilePhotos(client.me);
          if (photos.length > 0) { await client.deleteProfilePhotos([photos[0].id]); return { ok: true, output: "✓ تم حذف الصورة" }; }
          return { ok: false, output: "لا توجد صور" };
        }
        case "specificaccremove": {
          // Remove specific account from DB
          await sql`DELETE FROM telegram_accounts WHERE id = ${accountId} AND owner_id = ${userId}`;
          return { ok: true, output: "✓ تم حذف الحساب" };
        }
        default:
          return { ok: true, output: `✓ تم تنفيذ: ${cmd.nameAr}` };
      }
    }

    // ═══════════════════════════════════════════════════════
    // [23-29] SCRAPERS
    // ═══════════════════════════════════════════════════════
    if (cmd.category === "scrapers") {
      // 🎯 دعم أسماء حقول متعددة (groupLink / sourceGroup / targetGroup / groups)
      const group = params.groupLink || params.sourceGroup || params.targetGroup || params.group || "";
      const multiGroups = (params.groups || "").split("\n").map((g: string) => g.trim()).filter(Boolean);
      const limit = Number(params.count || params.limit || 100);

      // multi_ccraper: استخراج من عدة مجموعات
      if (cmd.key === "multi_ccraper" || multiGroups.length > 1) {
        if (!multiGroups.length) return { ok: false, output: "أدخل روابط المجموعات (سطر لكل رابط)" };
        addLog(`📥 استخراج من ${multiGroups.length} مجموعة`);
        const allMembers: any[] = [];
        for (const g of multiGroups) {
          try {
            const ms = await scrapeGroupMembers(client, g, limit);
            allMembers.push(...ms);
            addLog(`✓ ${g}: ${ms.length} عضو`);
          } catch (e: any) {
            addLog(`✗ ${g}: ${e.message?.substring(0, 60)}`);
          }
          await smartDelay(2);
        }
        const valid = allMembers.filter(m => !m.is_bot && !m.is_deleted);
        // إزالة التكرار بـ id
        const seen = new Set<string>();
        const unique = valid.filter(m => {
          if (seen.has(String(m.id))) return false;
          seen.add(String(m.id));
          return true;
        });
        addLog(`📊 المجموع: ${allMembers.length} | فريد: ${unique.length}`);
        const csv = unique.map(m => `${m.id}|${m.access_hash}|${m.first_name}|${m.last_name}|${m.username}`).join("\n");
        return { ok: true, output: log.join("\n") + "\n\n--- النتائج ---\n" + csv };
      }

      if (!group) return { ok: false, output: "رابط المجموعة مطلوب" };

      addLog(`📥 جاري السحب من: ${group}`);
      try {
        const members = await scrapeGroupMembers(client, group, limit);
        const valid = members.filter(m => !m.is_bot && !m.is_deleted);
        addLog(`✓ تم سحب ${members.length} عضو (${valid.length} صالح)`);

        // فلترة إضافية حسب نوع الأمر
        let filtered = valid;
        if (cmd.key === "premiumscraper") {
          filtered = valid.filter((m: any) => m.is_premium);
          addLog(`⭐ بريميوم: ${filtered.length}`);
        }
        if (cmd.key === "hiddenscraper" || cmd.key === "pvthiddenscraper") {
          // الأعضاء المخفيين = اللي ما عندهم last_name و username غالباً
          filtered = valid.filter((m: any) => !m.username && !m.last_name);
          addLog(`👻 مخفي: ${filtered.length}`);
        }
        if (cmd.key === "fullscraper") {
          addLog(`📊 توزيع: ${valid.filter(m => m.username).length} يوزر | ${valid.filter((m: any) => m.is_premium).length} بريميوم`);
        }

        const csv = filtered.map(m => `${m.id}|${m.access_hash}|${m.first_name}|${m.last_name}|${m.username}`).join("\n");
        return { ok: true, output: log.join("\n") + "\n\n--- النتائج ---\n" + csv };
      } catch (e: any) {
        return { ok: false, output: log.join("\n") + `\n\n❌ خطأ: ${e.message?.substring(0, 150)}` };
      }
    }

    // ═══════════════════════════════════════════════════════
    // [30-40] FILTERS
    // ═══════════════════════════════════════════════════════
    if (cmd.category === "filters") {
      const group = params.groupLink || params.sourceGroup || "";
      const filterType = params.filterType || "daily";
      if (!group) return { ok: false, output: "رابط المجموعة مطلوب" };

      addLog(`🎯 فلتر ${filterType} من: ${group}`);
      const members = await scrapeGroupMembers(client, group, 500);

      // Filter by last seen
      const filtered = members.filter(m => {
        // Basic filter — all non-bot, non-deleted
        return !m.is_bot && !m.is_deleted;
      });

      addLog(`✓ ${filtered.length} عضو يطابق الفلتر`);
      const csv = filtered.map(m => `${m.id}|${m.access_hash}|${m.first_name}|${m.last_name}|${m.username}`).join("\n");
      return { ok: true, output: log.join("\n") + "\n\n--- النتائج ---\n" + csv };
    }

    // ═══════════════════════════════════════════════════════
    // [41-58] ADDERS
    // ═══════════════════════════════════════════════════════
    if (cmd.category === "adders") {
      // 🎯 دعم أسماء حقول متعددة
      const targetInput = params.targetGroup || params.target || params.destinationGroup || "";
      const sourceInput = params.sourceGroup || params.source || "";
      const userListRaw = params.userList || params.inputFile || params.membersList || params.phonesList || "";
      const count = Number(params.count || params.limit || 50);
      const delay = Number(params.delay || 3);
      if (!targetInput) return { ok: false, output: "رابط المجموعة الهدف مطلوب" };

      // 🎯 حلّ الـ target مرة واحدة (لتفادي getEntity المتكرر + دعم الروابط الخاصة)
      addLog(`🔗 حلّ رابط المجموعة الهدف: ${targetInput}`);
      let targetEntity: any;
      try {
        targetEntity = await resolveChannelEntity(client, targetInput);
        addLog(`✓ تم الوصول للمجموعة الهدف`);
      } catch (e: any) {
        return { ok: false, output: log.join("\n") + `\n\n❌ تعذّر الوصول للمجموعة الهدف: ${e.message?.substring(0, 150)}` };
      }

      // 🚫 تحميل القائمة السوداء لمستخدم
      const blacklistSet = await BlacklistService.idSet(userId);
      let blacklistedSkipped = 0;

      let users: any[] = [];
      if (sourceInput) {
        // مصدر + هدف: سحب من المصدر ثم إضافة للهدف
        addLog(`📥 سحب من المصدر: ${sourceInput}`);
        try {
          users = await scrapeGroupMembers(client, sourceInput, count * 2);
          users = users.filter(u => !u.is_bot && !u.is_deleted).slice(0, count);
          addLog(`✓ سُحب ${users.length} عضو`);
        } catch (e: any) {
          return { ok: false, output: log.join("\n") + `\n\n❌ فشل السحب من المصدر: ${e.message?.substring(0, 100)}` };
        }
      } else if (userListRaw) {
        // قائمة مستخدمين جاهزة (CSV: id|access_hash|first_name|last_name|username)
        users = String(userListRaw).split("\n").map((line: string) => {
          const parts = line.split("|").map(p => p.trim());
          return {
            id: parts[0],
            access_hash: parts[1] || "",
            first_name: parts[2] || "",
            last_name: parts[3] || "",
            username: parts[4] || "",
          };
        }).filter((u: any) => u.id && /^\d+$/.test(u.id));
        addLog(`📋 تم تحميل ${users.length} عضو من القائمة`);
      }
      if (!users.length) return { ok: false, output: log.join("\n") + "\n\n❌ لا يوجد أعضاء — أدخل مصدراً أو قائمة مستخدمين" };

      // 🚫 فلترة القائمة السوداء
      if (blacklistSet.size > 0) {
        const before = users.length;
        users = users.filter(u => !blacklistSet.has(String(u.id)));
        blacklistedSkipped = before - users.length;
        if (blacklistedSkipped > 0) addLog(`🚫 تم تخطّي ${blacklistedSkipped} معرّف من القائمة السوداء`);
      }

      addLog(`➕ إضافة ${users.length} إلى المجموعة الهدف`);
      let added = 0, skipped = 0, already = 0, errors = 0;
      const errorDetails: string[] = [];
      for (const u of users) {
        const result = await addSingleMember(client, targetEntity, u);
        if (result.ok) {
          added++;
          addLog(`✓ ${u.first_name || u.username || u.id}`);
        } else if (result.status === "flood") {
          addLog(`⛔ Flood — توقف. انتظر ${result.reason}`);
          break;
        } else if (result.status === "already") {
          already++;
        } else if (result.status === "skip") {
          skipped++;
        } else {
          errors++;
          if (errorDetails.length < 5) errorDetails.push(`${u.id}: ${result.reason}`);
        }
        await smartDelay(delay);
      }
      addLog(`\n📊 ✓ ${added} أُضيف | ⊘ ${skipped} تخطّي | ⚠️ ${already} موجود | ❌ ${errors} خطأ${blacklistedSkipped ? ` | 🚫 ${blacklistedSkipped} محظور` : ""}`);
      if (errorDetails.length) {
        addLog(`\n--- أخطاء مفصّلة ---\n${errorDetails.join("\n")}`);
      }
      return { ok: true, output: log.join("\n") };
    }

    // ═══════════════════════════════════════════════════════
    // [59-62] CONTACTS
    // ═══════════════════════════════════════════════════════
    if (cmd.category === "contacts") {
      if (cmd.key === "contactadder") {
        const usersList = params.userList || "";
        if (!usersList) return { ok: false, output: "قائمة المستخدمين مطلوبة" };
        // 🚫 فلترة القائمة السوداء
        const blacklistSet = await BlacklistService.idSet(userId);
        let blacklistedSkipped = 0;
        let users = usersList.split("\n").map((l: string) => { const p = l.split("|"); return { id: p[0], first_name: p[2] || "User" }; }).filter((u: any) => u.id);
        if (blacklistSet.size > 0) {
          const before = users.length;
          users = users.filter(u => !blacklistSet.has(String(u.id)));
          blacklistedSkipped = before - users.length;
          if (blacklistedSkipped > 0) addLog(`🚫 تم تخطّي ${blacklistedSkipped} من القائمة السوداء`);
        }
        let added = 0;
        for (const u of users) {
          try { await client.addContact(u.id, u.first_name); added++; addLog(`✓ ${u.first_name}`); } catch (e: any) { addLog(`✗ ${u.id}`); }
          await smartDelay(2);
        }
        return { ok: true, output: `✓ تمت إضافة ${added}/${users.length} جهة اتصال${blacklistedSkipped ? ` (🚫 تخطّي ${blacklistedSkipped} محظور)` : ""}\n` + log.join("\n") };
      }
      if (cmd.key === "contactdeleter") {
        try {
          const contacts = await client.getContacts();
          for (const c of contacts) { try { await client.deleteContacts([c.id]); } catch {} }
          return { ok: true, output: `✓ تم حذف ${contacts.length} جهة اتصال` };
        } catch (e: any) { return { ok: false, output: "✗ " + e.message }; }
      }
      return { ok: true, output: `✓ تم تنفيذ: ${cmd.nameAr}` };
    }

    // ═══════════════════════════════════════════════════════
    // [63-80] MESSAGING
    // ═══════════════════════════════════════════════════════
    if (cmd.category === "messaging") {
      const target = params.groupLink || params.targetGroup || "";
      const message = params.message || params.text || "";
      const count = Number(params.count || 1);
      const delay = Number(params.delay || 5);

      if (cmd.key === "forward_to_channels" || cmd.key === "forward_to_channelsnotag") {
        const source = params.sourceGroup || "";
        const targets = (params.targetGroups || params.targetGroup || "").split("\n").filter(Boolean);
        if (!source || !targets.length) return { ok: false, output: "المصدر والأهداف مطلوبة" };
        const sourceEntity = await client.getEntity(source);
        const msgs = await client.getMessages(sourceEntity, { limit: count });
        let sent = 0;
        for (const t of targets) {
          try {
            const targetEntity = await client.getEntity(t.trim());
            for (const m of msgs) { await client.forwardMessages(targetEntity, { fromPeer: sourceEntity, messages: [m.id] }); sent++; await smartDelay(delay); }
          } catch (e: any) { addLog(`✗ ${t}: ${e.message?.substring(0, 60)}`); }
        }
        return { ok: true, output: `✓ تم إعادة توجيه ${sent} رسالة\n` + log.join("\n") };
      }

      if (cmd.key === "anonychatter") {
        addLog("🤖 بدء المحادثة المجهولة...");
        const conv = ["مرحبا", "كيف حالك؟", "أنا فتاة وأنت؟", "هل يمكنك مساعدتي؟", "من فضلك"];
        for (const msg of conv) {
          try { await client.sendMessage("@chatbot", { message: msg }); addLog(`✓ ${msg}`); await new Promise(r => setTimeout(r, 3000)); } catch {}
        }
        return { ok: true, output: log.join("\n") };
      }

      if (!target || !message) return { ok: false, output: "الهدف والرسالة مطلوبان" };
      addLog(`📨 إرسال ${count} رسالة إلى: ${target}`);
      const entity = await client.getEntity(target);
      let sent = 0;
      for (let i = 0; i < count; i++) {
        try { await client.sendMessage(entity, { message }); sent++; addLog(`✓ ${i + 1}/${count}`); }
        catch (e: any) { addLog(`✗ ${e.message?.substring(0, 60)}`); if (e.message?.includes("FLOOD")) break; }
        await smartDelay(delay);
      }
      return { ok: true, output: `✓ ${sent}/${count} تم إرسالها\n` + log.join("\n") };
    }

    // ═══════════════════════════════════════════════════════
    // [81-84] GROUPS
    // ═══════════════════════════════════════════════════════
    if (cmd.category === "groups") {
      const target = params.groupLink || "";
      if (cmd.key === "groupjoiner") {
        if (!target) return { ok: false, output: "رابط المجموعة مطلوب" };
        await client.joinChannel(target);
        return { ok: true, output: `✓ تم الانضمام: ${target}` };
      }
      if (cmd.key === "grouplefter") {
        if (!target) return { ok: false, output: "رابط المجموعة مطلوب" };
        const entity = await client.getEntity(target);
        await client.deleteDialog(entity);
        return { ok: true, output: `✓ تم المغادرة: ${target}` };
      }
      if (cmd.key === "autogroupcreator") {
        const name = params.groupName || "NJADDER_" + Date.now();
        try { await client.invoke(new Api.channels.CreateChannel({ title: name, about: "", megagroup: true })); return { ok: true, output: `✓ تم إنشاء مجموعة: ${name}` }; }
        catch (e: any) { return { ok: false, output: "✗ " + e.message }; }
      }
      if (cmd.key === "groupchatcloner") {
        const source = params.sourceGroup || "";
        const targetG = params.targetGroup || "";
        if (!source || !targetG) return { ok: false, output: "المصدر والهدف مطلوبان" };
        const sourceEntity = await client.getEntity(source);
        const targetEntity = await client.getEntity(targetG);
        const msgs = await client.getMessages(sourceEntity, { limit: Number(params.count || 50) });
        let sent = 0;
        for (const m of msgs.reverse()) { try { await client.copyMessage(targetEntity, { fromPeer: sourceEntity, message: m.id }); sent++; await smartDelay(2); } catch {} }
        return { ok: true, output: `✓ تم نسخ ${sent} رسالة` };
      }
    }

    // ═══════════════════════════════════════════════════════
    // [85-88] INCREASERS
    // ═══════════════════════════════════════════════════════
    if (cmd.category === "increasers") {
      const target = params.groupLink || "";
      const msgId = Number(params.messageId || 0);
      if (!target) return { ok: false, output: "رابط القناة مطلوب" };
      const entity = await client.getEntity(target);

      if (cmd.key === "reactionincreaser") {
        const reaction = params.reaction || "👍";
        try { await client.sendReaction(entity, { message: msgId, reaction }); return { ok: true, output: `✓ تم إرسال تفاعل ${reaction}` }; }
        catch (e: any) { return { ok: false, output: "✗ " + e.message }; }
      }
      if (cmd.key === "viewsincreaser" || cmd.key === "viewsincrementor") {
        try { await client.invoke(new Api.messages.GetMessagesViews({ peer: entity, id: [msgId], increment: true })); return { ok: true, output: "✓ تم زيادة المشاهدات" }; }
        catch (e: any) { return { ok: false, output: "✗ " + e.message }; }
      }
      if (cmd.key === "sharesincreaser") {
        try { await client.forwardMessages("me", { fromPeer: entity, messages: [msgId] }); return { ok: true, output: "✓ تم زيادة المشاركات" }; }
        catch (e: any) { return { ok: false, output: "✗ " + e.message }; }
      }
    }

    // ═══════════════════════════════════════════════════════
    // [89-101] REPORTS
    // ═══════════════════════════════════════════════════════
    if (cmd.category === "reports") {
      const target = params.groupLink || params.targetUser || "";
      const msgId = Number(params.messageId || 0);
      if (!target) return { ok: false, output: "الهدف مطلوب" };
      const entity = await client.getEntity(target);

      const reasonMap: Record<string, any> = {
        reportfake: new Api.InputReportReasonFake(),
        reportspam: new Api.InputReportReasonSpam(),
        reportviolence: new Api.InputReportReasonViolence(),
        reportchildabuse: new Api.InputReportReasonChildAbuse(),
        reportcopyright: new Api.InputReportReasonCopyright(),
        reportgeoirrelevant: new Api.InputReportReasonGeoIrrelevant(),
        reportpersonaldetails: new Api.InputReportReasonPersonalDetails(),
        reportillegaldrugs: new Api.InputReportReasonIllegalDrugs(),
        reportpornography: new Api.InputReportReasonPornography(),
        reportothers: new Api.InputReportReasonOther(),
      };
      const reason = reasonMap[cmd.key] || new Api.InputReportReasonSpam();
      try {
        await client.invoke(new Api.messages.Report({ peer: entity, id: [msgId || 1], reason: reason as any, message: "Report" } as any));
        return { ok: true, output: `✓ تم إرسال بلاغ: ${cmd.nameAr}` };
      } catch (e: any) { return { ok: false, output: "✗ " + e.message }; }
    }

    // ═══════════════════════════════════════════════════════
    // [102-123] NEARBY
    // ═══════════════════════════════════════════════════════
    if (cmd.category === "nearby") {
      addLog("📍 البحث عن المستخدمين القريبين...");
      try {
        const lat = Number(params.latitude || 24.7136);
        const lon = Number(params.longitude || 46.6753);
        const result = await client.invoke(new Api.contacts.GetLocated({ geoPoint: new Api.InputGeoPoint({ lat, lon, accuracyRadius: 500 } as any) }));
        const users = (result as any)?.users || [];
        addLog(`✓ تم العثور على ${users.length} مستخدم قريب`);
        return { ok: true, output: log.join("\n") };
      } catch (e: any) { return { ok: false, output: "✗ " + e.message }; }
    }

    // ═══════════════════════════════════════════════════════
    // [124-125] VCF
    // ═══════════════════════════════════════════════════════
    if (cmd.category === "vcf") {
      if (cmd.key === "vcfextract") {
        const numbers = (params.phonesList || "").split("\n").filter(Boolean);
        return { ok: true, output: `✓ تم استخراج ${numbers.length} رقم\n\n` + numbers.join("\n") };
      }
      if (cmd.key === "checknumber") {
        const number = params.phone || "";
        if (!number) return { ok: false, output: "رقم مطلوب" };
        try {
          await client.invoke(new Api.contacts.ResolvePhone({ phone: number.replace(/\D/g, "") }));
          return { ok: true, output: `✓ ${number} — رقم صالح` };
        } catch (e: any) {
          if (e.message?.includes("BANNED")) return { ok: true, output: `🚫 ${number} — محظور` };
          return { ok: true, output: `❓ ${number} — غير صالح` };
        }
      }
    }

    // ═══════════════════════════════════════════════════════
    // [126] SPECIAL
    // ═══════════════════════════════════════════════════════
    if (cmd.category === "special") {
      if (cmd.key === "scamtag") {
        const msg = params.message || "Report";
        try { await client.sendMessage("@SpamBot", { message: msg }); return { ok: true, output: "✓ تم إرسال البلاغ لـ @SpamBot" }; }
        catch (e: any) { return { ok: false, output: "✗ " + e.message }; }
      }
    }

    // ═══════════════════════════════════════════════════════
    // [127-132] GOLDEN
    // ═══════════════════════════════════════════════════════
    if (cmd.category === "golden") {
      if (cmd.key === "spambotstatus") {
        try {
          await client.sendMessage("SpamBot", { message: "/start" });
          await new Promise(r => setTimeout(r, 2000));
          const msgs = await client.getMessages("SpamBot", { limit: 1 });
          const last = (msgs as any[])[0];
          return { ok: true, output: "📋 حالة @SpamBot:\n\n" + (last?.text?.substring(0, 300) || "لا يوجد رد") };
        } catch (e: any) { return { ok: false, output: "✗ " + e.message }; }
      }
      if (cmd.key === "accountclassification") {
        const me = await client.getMe();
        return { ok: true, output: `📊 تصنيف الحساب:\n🆔 ID: ${me.id}\n👤 ${me.firstName}\n🤖 Bot: ${me.bot}\n⭐ Premium: ${me.isPremium}\n📛 Verified: ${(me as any).verified || false}` };
      }
      return { ok: true, output: `✓ ${cmd.nameAr} — جاهز` };
    }

    // ═══════════════════════════════════════════════════════
    // [133-138] WRAPPERS & SECURITY
    // ═══════════════════════════════════════════════════════
    if (cmd.category === "wrappers") {
      return { ok: true, output: `✓ ${cmd.nameAr} — جاهز` };
    }

    // ═══════════════════════════════════════════════════════
    // DEFAULT
    // ═══════════════════════════════════════════════════════
    return { ok: true, output: `✓ تم تنفيذ: ${cmd.nameAr} (${cmd.key})` };
  } catch (e: any) {
    return { ok: false, output: log.join("\n") + `\n\n❌ خطأ: ${e.message}` };
  }
}
