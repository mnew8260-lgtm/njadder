import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema, BlacklistService } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { MultiAccountManager } from "@/lib/multiAccount";
import { addSingleMember, smartDelay, resolveChannelEntity } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// POST — إضافة متعددة الحسابات (rotation تلقائي عند Flood/أخطاء)
// body: {
//   targetGroup, sourceGroup?, userList?,
//   count?, delay?,
//   accountIds?: string[],       // حسابات محددة
//   rotateMode?: "auto" | "selected",
//   switchOnError?: number,     // تبديل الحساب بعد X خطأ متتالي (default 3)
//   switchOnFlood?: boolean      // تبديل فوراً عند Flood (default true)
// }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  if (user.role !== "admin" && user.status !== "approved") {
    return NextResponse.json({ ok: false, error: "حسابك بانتظار موافقة المطور" }, { status: 403 });
  }

  // Rate limit
  const rl = checkRateLimit(`add:${user.id}`, RATE_LIMITS.execute.max, RATE_LIMITS.execute.windowMs);
  if (!rl.allowed) {
    const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { ok: false, error: `تجاوزت الحد المسموح. حاول بعد ${retryAfter} ثانية.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const {
      targetGroup,
      sourceGroup,
      userList,
      count = 50,
      delay = 3,
      accountIds,
      switchOnError = 3,
      switchOnFlood = true,
    } = await req.json();

    if (!targetGroup) {
      return NextResponse.json({ ok: false, error: "رابط المجموعة الهدف مطلوب" }, { status: 400 });
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

    const connectResult = await manager.connectAll();

    if (connectResult.connected === 0) {
      await manager.disconnectAll();
      return NextResponse.json({
        ok: false,
        error: `تعذّر الاتصال بأي حساب. التفاصيل:\n${connectResult.details.join("\n")}`,
      }, { status: 500 });
    }

    const log: string[] = [];
    const addLog = (msg: string) => log.push(msg);

    addLog(`🔗 متصل بـ ${connectResult.connected}/${manager.totalCount} حساب`);

    // ─── حلّ target مرة واحدة (باستخدام أول حساب متاح) ───
    addLog(`🎯 حلّ رابط المجموعة الهدف: ${targetGroup}`);
    let targetEntity: any;
    const resolveAcc = manager.getAvailable();
    if (!resolveAcc) {
      await manager.disconnectAll();
      return NextResponse.json({ ok: false, error: "لا يوجد حساب متاح لحلّ الرابط" }, { status: 500 });
    }

    try {
      targetEntity = await resolveChannelEntity(resolveAcc.client!, targetGroup);
      addLog(`✓ تم الوصول للمجموعة الهدف`);
    } catch (e: any) {
      await manager.disconnectAll();
      return NextResponse.json({
        ok: false,
        error: `تعذّر الوصول للمجموعة الهدف: ${e.message?.substring(0, 100)}`,
      }, { status: 500 });
    }

    // ─── حلّ source (لو موجود) ───
    let sourceEntity: any = null;
    if (sourceGroup) {
      addLog(`📥 حلّ رابط المصدر: ${sourceGroup}`);
      try {
        sourceEntity = await resolveChannelEntity(resolveAcc.client!, sourceGroup);
        addLog(`✓ تم الوصول للمصدر`);
      } catch (e: any) {
        addLog(`⚠️ تعذّر حلّ المصدر، سنحاول السحب من كل حساب على حدة`);
      }
    }

    // ─── تحضير قائمة المستخدمين ───
    let users: any[] = [];
    if (sourceGroup && sourceEntity) {
      addLog(`📥 سحب الأعضاء من المصدر...`);
      try {
        users = await scrapeGroupMembersFromManager(manager, sourceGroup, count * 2);
        users = users.filter(u => !u.is_bot && !u.is_deleted).slice(0, count);
        addLog(`✓ سُحب ${users.length} عضو`);
      } catch (e: any) {
        await manager.disconnectAll();
        return NextResponse.json({
          ok: false,
          error: `فشل السحب من المصدر: ${e.message?.substring(0, 100)}`,
        }, { status: 500 });
      }
    } else if (userList) {
      users = String(userList).split("\n").map((line: string) => {
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

    if (!users.length) {
      await manager.disconnectAll();
      return NextResponse.json({ ok: false, error: "لا يوجد أعضاء للإضافة" }, { status: 400 });
    }

    // ─── فلترة القائمة السوداء ───
    const blacklistSet = await BlacklistService.idSet(user.id);
    let blacklistedSkipped = 0;
    if (blacklistSet.size > 0) {
      const before = users.length;
      users = users.filter(u => !blacklistSet.has(String(u.id)));
      blacklistedSkipped = before - users.length;
      if (blacklistedSkipped > 0) addLog(`🚫 تخطّي ${blacklistedSkipped} من القائمة السوداء`);
    }

    // ─── الإضافة مع rotation ───
    addLog(`\n➕ إضافة ${users.length} إلى المجموعة الهدف`);
    let added = 0, skipped = 0, already = 0, errors = 0;
    const skipReasons: Record<string, number> = {};
    let consecutiveErrors = 0;
    let currentAcc = manager.getAvailable();

    if (!currentAcc) {
      await manager.disconnectAll();
      return NextResponse.json({ ok: false, error: "لا يوجد حساب متاح للإضافة" }, { status: 500 });
    }

    addLog(`📱 الحساب الحالي: ${currentAcc.fullName || currentAcc.phone}`);

    for (const u of users) {
      // لو الحساب الحالي في flood، ننتقل لآخر
      if (!currentAcc || (currentAcc.floodUntil && currentAcc.floodUntil > Date.now())) {
        const newAcc = manager.getAvailable();
        if (!newAcc) {
          addLog(`⛔ لا يوجد حسابات متاحة — توقف`);
          break;
        }
        currentAcc = newAcc;
        addLog(`\n📱 التبديل إلى: ${currentAcc.fullName || currentAcc.phone}`);
        consecutiveErrors = 0;
      }

      const result = await addSingleMember(currentAcc.client!, targetEntity, u, sourceEntity || undefined);

      if (result.ok) {
        added++;
        consecutiveErrors = 0;
        manager.recordSuccess(currentAcc.id, "add");
        addLog(`✓ ${u.first_name || u.username || u.id} (${currentAcc.fullName || currentAcc.phone})`);
      } else if (result.status === "flood") {
        const match = result.reason.match(/انتظر (\d+)s/);
        const seconds = match ? Number(match[1]) : 60;
        manager.markFlood(currentAcc.id, seconds);
        addLog(`⏰ Flood على ${currentAcc.fullName || currentAcc.phone} — ${seconds}s`);

        if (switchOnFlood) {
          // نحاول نفس العضو بحساب آخر
          const newAcc = manager.getAvailable(undefined, new Set([currentAcc.id]));
          if (newAcc) {
            currentAcc = newAcc;
            addLog(`📱 التبديل إلى: ${currentAcc.fullName || currentAcc.phone}`);
            // نعيد المحاولة بنفس العضو
            const retryResult = await addSingleMember(currentAcc.client!, targetEntity, u, sourceEntity || undefined);
            if (retryResult.ok) {
              added++;
              manager.recordSuccess(currentAcc.id, "add");
              addLog(`✓ ${u.first_name || u.username || u.id} (${currentAcc.fullName || currentAcc.phone})`);
              await smartDelay(delay);
              continue;
            } else if (retryResult.status === "flood") {
              const m2 = retryResult.reason.match(/انتظر (\d+)s/);
              const s2 = m2 ? Number(m2[1]) : 60;
              manager.markFlood(currentAcc.id, s2);
              skipped++;
              skipReasons["flood على كل الحسابات"] = (skipReasons["flood على كل الحسابات"] || 0) + 1;
              continue;
            }
          } else {
            addLog(`⛔ كل الحسابات في flood — توقف`);
            break;
          }
        }
        skipped++;
        skipReasons["flood"] = (skipReasons["flood"] || 0) + 1;
      } else if (result.status === "already") {
        already++;
      } else if (result.status === "skip") {
        skipped++;
        const r = result.reason || "غير معروف";
        skipReasons[r] = (skipReasons[r] || 0) + 1;
        consecutiveErrors++;

        // تبديل الحساب بعد X خطأ متتالي
        if (consecutiveErrors >= switchOnError) {
          addLog(`⚠️ ${consecutiveErrors} أخطاء متتالية — تبديل الحساب`);
          const newAcc = manager.getAvailable(undefined, new Set([currentAcc.id]));
          if (newAcc) {
            currentAcc = newAcc;
            addLog(`📱 التبديل إلى: ${currentAcc.fullName || currentAcc.phone}`);
            consecutiveErrors = 0;
          } else {
            addLog(`⛔ لا يوجد حسابات بديلة — استمرار بالحساب الحالي`);
            consecutiveErrors = 0;
          }
        }
      } else {
        errors++;
        if (errors < 5) addLog(`❌ ${u.id}: ${result.reason}`);
        manager.recordError(currentAcc.id, result.reason || "خطأ");
      }
      await smartDelay(delay);
    }

    addLog(`\n📊 ✓ ${added} أُضيف | ⊘ ${skipped} تخطّي | ⚠️ ${already} موجود | ❌ ${errors} خطأ${blacklistedSkipped ? ` | 🚫 ${blacklistedSkipped} محظور` : ""}`);

    // أسباب التخطّي
    if (skipped > 0 && Object.keys(skipReasons).length > 0) {
      addLog(`\n--- أسباب التخطّي ---`);
      for (const [reason, c] of Object.entries(skipReasons).sort((a, b) => b[1] - a[1])) {
        addLog(`  • ${reason}: ${c}`);
      }
    }

    // حالة الحسابات
    addLog(`\n--- حالة الحسابات ---`);
    const statuses = manager.getStatus();
    for (const s of statuses) {
      const flood = s.inFlood ? ` ⏰${s.floodRemaining}s` : "";
      const err = s.lastError ? ` ⚠️${s.lastError.substring(0, 30)}` : "";
      addLog(`  • ${s.fullName || s.phone}: إضافات ${s.addCount} | أخطاء ${s.errorCount}${flood}${err}`);
    }

    await manager.disconnectAll();

    return NextResponse.json({
      ok: true,
      output: log.join("\n"),
      stats: {
        added,
        skipped,
        already,
        errors,
        blacklistedSkipped,
        accountsUsed: statuses.filter(s => s.addCount > 0).length,
        totalAccounts: manager.totalCount,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// Helper: سحب من مجموعة باستخدام عدة حسابات
async function scrapeGroupMembersFromManager(
  manager: MultiAccountManager,
  groupInput: string,
  limit: number
): Promise<any[]> {
  const { scrapeGroupMembers } = await import("@/lib/telegram");
  let result: any[] = [];
  const tried = new Set<string>();

  while (result.length < limit) {
    const acc = manager.getAvailable(undefined, tried);
    if (!acc) break;
    try {
      const batch = await scrapeGroupMembers(acc.client!, groupInput, limit - result.length);
      const seen = new Set(result.map(m => String(m.id)));
      const unique = batch.filter(m => !seen.has(String(m.id)));
      result.push(...unique);
      manager.recordSuccess(acc.id, "scrape");
      if (batch.length < (limit - result.length)) {
        // الحساب وصل لآخر الأعضاء
        tried.add(acc.id);
      }
    } catch (e: any) {
      manager.recordError(acc.id, e.message);
      tried.add(acc.id);
    }
  }
  return result;
}
