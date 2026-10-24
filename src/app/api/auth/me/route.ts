import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSubscriptionStatus } from "@/lib/subscription";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, user: null });

    // جلب حالة الاشتراك الكاملة
    const subscription = await getSubscriptionStatus(user.id);

    return NextResponse.json({
      ok: true,
      user: {
        ...user,
        // إضافة معلومات الاشتراك
        subscriptionState: subscription.state,
        daysLeft: subscription.daysLeft,
        hoursLeft: subscription.hoursLeft,
        trialEndsAt: subscription.trialEndsAt,
        subscriptionEndsAt: subscription.subscriptionEndsAt,
        plan: subscription.plan,
        bannedReason: subscription.bannedReason,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, user: null, error: e.message }, { status: 500 });
  }
}
