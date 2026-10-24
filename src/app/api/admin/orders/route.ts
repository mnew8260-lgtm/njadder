import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllOrders, confirmOrder, rejectOrder, getAdminStats } from "@/lib/subscription";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — قائمة كل الطلبات (admin) + إحصائيات
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const filter = (searchParams.get("filter") as any) || "pending";
    const orders = await getAllOrders(filter);
    const stats = await getAdminStats();
    return NextResponse.json({ ok: true, orders, stats });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// POST — تأكيد / رفض طلب
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });

  try {
    const { action, orderId, reason } = await req.json();
    if (!action || !orderId) {
      return NextResponse.json({ ok: false, error: "action and orderId required" }, { status: 400 });
    }

    if (action === "confirm") {
      const result = await confirmOrder(orderId, user.id);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    if (action === "reject") {
      const result = await rejectOrder(orderId, user.id, reason || "مرفوض من الإدارة");
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
