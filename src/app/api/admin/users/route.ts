import { NextRequest, NextResponse } from "next/server";
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
  return NextResponse.json({ ok: true, users });
}

// POST — set user plan (admin only)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });

  try {
    const { userId, plan, days } = await req.json();
    if (!userId || !plan) return NextResponse.json({ ok: false, error: "userId and plan required" }, { status: 400 });

    const planType = plan as PlanType;
    if (!PLAN_CONFIG[planType]) return NextResponse.json({ ok: false, error: "Invalid plan" }, { status: 400 });

    const durationDays = days || PLAN_CONFIG[planType].duration;
    await SubscriptionService.setPlan(userId, planType, durationDays);

    return NextResponse.json({
      ok: true,
      message: `تم تعيين خطة ${PLAN_CONFIG[planType].name} لمدة ${durationDays} يوم`,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
