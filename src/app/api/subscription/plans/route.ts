import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { SubscriptionService, PLAN_CONFIG } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  try {
    const sub = await SubscriptionService.getPlan(user.id);
    const plans = Object.entries(PLAN_CONFIG).map(([key, config]) => ({
      id: key,
      name: config.name,
      price: config.price,
      duration: config.duration,
      icon: config.icon,
      limits: config.limits,
      features: config.features,
      is_current: sub.plan === key && sub.active,
    }));

    return NextResponse.json({ ok: true, current: sub, plans });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
