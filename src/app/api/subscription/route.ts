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
    const usage = await SubscriptionService.getUsage(user.id);
    const config = PLAN_CONFIG[sub.plan];

    return NextResponse.json({
      ok: true,
      plan: sub.plan,
      plan_name: config.name,
      plan_icon: config.icon,
      price: config.price,
      active: sub.active,
      expires: sub.expires || null,
      features: config.features,
      limits: config.limits,
      usage: {
        scrape: { used: usage.scrape, limit: config.limits.scrape, remaining: Math.max(0, config.limits.scrape - usage.scrape) },
        add: { used: usage.add, limit: config.limits.add, remaining: Math.max(0, config.limits.add - usage.add) },
        message: { used: usage.message, limit: config.limits.message, remaining: Math.max(0, config.limits.message - usage.message) },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
