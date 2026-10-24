import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema, BlacklistService } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { MultiAccountManager } from "@/lib/multiAccount";
import { scrapeGroupMembers } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// POST — سحب متعدد الحسابات (rotation تلقائي)
// body: { groupLink, count, accountIds?: string[], rotateMode?: "auto" | "selected" }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  if (user.role !== "admin" && user.status !== "approved") {
    return NextResponse.json({ ok: false, error: "حسابك بانتظار موافقة المطور" }, { status: 403 });
  }

  // Rate limit
  const rl = checkRateLimit(`scrape:${user.id}`, RATE_LIMITS.execute.max, RATE_LIMITS.execute.windowMs);
  if (!rl.allowed) {
    const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { ok: false, error: `تجاوزت الحد المسموح. حاول بعد ${retryAfter} ثانية.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const { groupLink, count = 100, accountIds, rotateMode = "auto" } = await req.json();

    if (!groupLink) {
      return NextResponse.json({ ok: false, error: "رابط المجموعة مطلوب" }, { status: 400 });
    }

    await ensureSchema();

    // ─── تحميل الحسابات ───
    const filterIds = accountIds && accountIds.length > 0 ? accountIds : null;
    const accountRows = filterIds
      ? await sql`SELECT * FROM telegram_accounts WHERE owner_id = ${user.id} AND id = ANY(${filterIds})`
      : await sql`SELECT * FROM telegram_accounts WHERE owner_id = ${user.id}`;

    if ((accountRows as any[]).length === 0) {
      return NextResponse.json({ ok: false, error: "لا توجد حسابات متاحة" }, { status: 400 });
    }

    // ─── Multi-Account Manager ───
    const manager = new MultiAccountManager();
    manager.loadAccounts(accountRows as any[]);

    // الاتصال بكل الحسابات
    const { connected, failed, details } = await manager.connectAll();

    if (connected === 0) {
      await manager.disconnectAll();
      return NextResponse.json({
        ok: false,
        error: `تعذّر الاتصال بأي حساب. التفاصيل:\n${details.join("\n")}`,
      }, { status: 500 });
    }

    const log: string[] = [];
    const addLog = (msg: string) => log.push(msg);

    addLog(`🔗 متصل بـ ${connected}/${manager.totalCount} حساب`);
    if (failed > 0) addLog(`⚠️ ${failed} حساب فشل في الاتصال`);
    addLog(`📥 السحب من: ${groupLink}`);
    addLog(`🎯 العدد المطلوب: ${count} عضو`);

    // ─── السحب مع rotation ───
    let allMembers: any[] = [];
    const triedAccounts = new Set<string>();

    while (allMembers.length < count) {
      const acc = manager.getAvailable(undefined, triedAccounts);
      if (!acc) {
        addLog(`⚠️ لا يوجد حسابات متاحة إضافية`);
        break;
      }

      addLog(`\n📱 استخدام حساب: ${acc.fullName || acc.phone}`);
      try {
        const remaining = count - allMembers.length;
        const batch = await scrapeGroupMembers(acc.client!, groupLink, remaining);
        // إزالة التكرار
        const seen = new Set(allMembers.map(m => String(m.id)));
        const unique = batch.filter(m => !seen.has(String(m.id)));
        allMembers.push(...unique);
        manager.recordSuccess(acc.id, "scrape");
        addLog(`✓ سُحب ${batch.length} عضو (${unique.length} فريد) — الإجمالي: ${allMembers.length}`);

        // لو وصلنا للعدد المطلوب
        if (allMembers.length >= count) break;

        // لو السحبة الواحدة كانت أقل من المطلوب، ننتقل لحساب آخر
        if (batch.length < remaining) {
          addLog(`ℹ️ الحساب وصل لآخر الأعضاء، ننتقل للحساب التالي`);
          triedAccounts.add(acc.id);
        }
      } catch (e: any) {
        const errMsg = e.message || "";
        addLog(`✗ خطأ: ${errMsg.substring(0, 80)}`);
        manager.recordError(acc.id, errMsg);

        // لو Flood، نضع الحساب في فترة انتظار
        const floodMatch = errMsg.match(/FLOOD_WAIT_(\d+)/);
        if (floodMatch) {
          const seconds = Number(floodMatch[1]);
          manager.markFlood(acc.id, seconds);
          addLog(`⏰ Flood — الحساب متجمّد ${seconds}s`);
        }
        triedAccounts.add(acc.id);
      }
    }

    // ─── فلترة القائمة السوداء ───
    const blacklistSet = await BlacklistService.idSet(user.id);
    let blacklistedSkipped = 0;
    if (blacklistSet.size > 0) {
      const before = allMembers.length;
      allMembers = allMembers.filter(m => !blacklistSet.has(String(m.id)));
      blacklistedSkipped = before - allMembers.length;
    }

    // ─── تنظيف ───
    const valid = allMembers.filter(m => !m.is_bot && !m.is_deleted);
    addLog(`\n📊 النتائج النهائية:`);
    addLog(`  • إجمالي المسحوبين: ${allMembers.length}`);
    addLog(`  • صالح: ${valid.length}`);
    addLog(`  • محظور في القائمة السوداء: ${blacklistedSkipped}`);

    // ─── عرض حالة الحسابات ───
    addLog(`\n--- حالة الحسابات ---`);
    const statuses = manager.getStatus();
    for (const s of statuses) {
      const flood = s.inFlood ? ` ⏰${s.floodRemaining}s` : "";
      const err = s.lastError ? ` ⚠️${s.lastError.substring(0, 30)}` : "";
      addLog(`  • ${s.fullName || s.phone}: سحب ${s.scrapeCount}${flood}${err}`);
    }

    // CSV output
    const csv = valid.map(m =>
      `${m.id}|${m.access_hash}|${m.first_name}|${m.last_name}|${m.username}`
    ).join("\n");

    await manager.disconnectAll();

    return NextResponse.json({
      ok: true,
      output: log.join("\n") + "\n\n--- النتائج ---\n" + csv,
      stats: {
        total: allMembers.length,
        valid: valid.length,
        blacklistedSkipped,
        accountsUsed: statuses.filter(s => s.scrapeCount > 0).length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
