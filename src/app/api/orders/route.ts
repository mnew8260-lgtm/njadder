import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createOrder, getUserOrders, getSettings, PlanKey, PLAN_CONFIG } from "@/lib/subscription";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — قائمة طلبات المستخدم الحالي
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  try {
    const orders = await getUserOrders(user.id);
    const settings = await getSettings();
    return NextResponse.json({ ok: true, orders, settings });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// POST — إنشاء طلب جديد
// body: { plan: "1m" | "3m" | "1y" }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  try {
    const { plan } = await req.json();
    if (!plan || !["1m", "3m", "1y"].includes(plan)) {
      return NextResponse.json({ ok: false, error: "الباقة غير صالحة" }, { status: 400 });
    }

    // التحقق من عدم وجود طلب معلّق سابق
    const existing = await getUserOrders(user.id);
    const pending = existing.find((o: any) => o.status === "pending");
    if (pending) {
      return NextResponse.json({
        ok: false,
        error: "لديك طلب معلّق بالفعل",
        pendingOrder: pending,
      }, { status: 400 });
    }

    const order = await createOrder(user.id, user.username, plan as PlanKey);
    const settings = await getSettings();

    return NextResponse.json({
      ok: true,
      order,
      settings,
      planInfo: PLAN_CONFIG[plan as PlanKey],
      message: "تم إنشاء الطلب بنجاح. اتبع تعليمات الدفع بالأسفل.",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
