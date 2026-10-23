import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SubscriptionService, PLAN_CONFIG, PlanType } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — list all users (admin only)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });

  const users = await SubscriptionService.getAllUsers();
  // عدّ المستخدمين حسب الحالة لإحصائيات سريعة
  const stats = {
    total: users.length,
    pending: users.filter((u: any) => u.status === "pending").length,
    approved: users.filter((u: any) => u.status === "approved" || u.role === "admin").length,
    rejected: users.filter((u: any) => u.status === "rejected").length,
  };
  return NextResponse.json({ ok: true, users, stats });
}

// POST — admin actions: set_plan / approve / reject / delete
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });

  try {
    const body = await req.json();
    const { action, userId, plan, days } = body;

    // ─── تعيين خطة اشتراك ───
    if (action === "set_plan" || (!action && plan)) {
      if (!userId || !plan) return NextResponse.json({ ok: false, error: "userId and plan required" }, { status: 400 });
      const planType = plan as PlanType;
      if (!PLAN_CONFIG[planType]) return NextResponse.json({ ok: false, error: "Invalid plan" }, { status: 400 });
      const durationDays = days || PLAN_CONFIG[planType].duration;
      await SubscriptionService.setPlan(userId, planType, durationDays);
      return NextResponse.json({
        ok: true,
        message: `تم تعيين خطة ${PLAN_CONFIG[planType].name} لمدة ${durationDays} يوم`,
      });
    }

    // ─── موافقة على مستخدم ───
    if (action === "approve") {
      if (!userId) return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
      await sql`UPDATE users SET status = 'approved' WHERE id = ${userId}`;
      return NextResponse.json({ ok: true, message: "✅ تمت الموافقة على المستخدم" });
    }

    // ─── رفض مستخدم ───
    if (action === "reject") {
      if (!userId) return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
      await sql`UPDATE users SET status = 'rejected' WHERE id = ${userId}`;
      return NextResponse.json({ ok: true, message: "🚫 تم رفض المستخدم" });
    }

    // ─── إعادة لمستخدم معلّق (من مرفوض → معلّق) ───
    if (action === "pending") {
      if (!userId) return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
      await sql`UPDATE users SET status = 'pending' WHERE id = ${userId}`;
      return NextResponse.json({ ok: true, message: "⏳ تم إعادة المستخدم لقائمة الانتظار" });
    }

    // ─── حذف مستخدم نهائياً ───
    if (action === "delete") {
      if (!userId) return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
      // منع حذف الأدمن لنفسه
      if (userId === user.id) return NextResponse.json({ ok: false, error: "لا يمكن حذف حسابك الحالي" }, { status: 400 });
      const target = await sql`SELECT role FROM users WHERE id = ${userId}`;
      const t = (target as any[])[0];
      if (t?.role === "admin") return NextResponse.json({ ok: false, error: "لا يمكن حذف أدمن" }, { status: 400 });
      // تنظيف: حذف الحسابات والقائمة السوداء المرتبطة
      await sql`DELETE FROM telegram_accounts WHERE owner_id = ${userId}`;
      await sql`DELETE FROM blacklist WHERE owner_id = ${userId}`;
      await sql`DELETE FROM usage_log WHERE user_id = ${userId}`;
      await sql`DELETE FROM users WHERE id = ${userId}`;
      return NextResponse.json({ ok: true, message: "🗑 تم حذف المستخدم وكل بياناته" });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
