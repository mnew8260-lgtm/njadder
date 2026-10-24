import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { banUser, unbanUser, extendSubscription } from "@/lib/subscription";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST — ban / unban / extend (admin فقط)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });

  try {
    const { action, userId, reason, days } = await req.json();
    if (!action || !userId) {
      return NextResponse.json({ ok: false, error: "action and userId required" }, { status: 400 });
    }
    if (userId === user.id) {
      return NextResponse.json({ ok: false, error: "لا يمكنك تنفيذ هذا الإجراء على حسابك" }, { status: 400 });
    }

    if (action === "ban") {
      await banUser(userId, reason || "مخالفة الشروط");
      return NextResponse.json({ ok: true, message: "تم حظر المستخدم" });
    }
    if (action === "unban") {
      await unbanUser(userId);
      return NextResponse.json({ ok: true, message: "تم رفع الحظر" });
    }
    if (action === "extend") {
      const daysNum = Number(days || 0);
      if (daysNum <= 0) return NextResponse.json({ ok: false, error: "أيام غير صالحة" }, { status: 400 });
      const result = await extendSubscription(userId, daysNum);
      return NextResponse.json({
        ok: true,
        message: `تم تمديد الاشتراك ${daysNum} يوم`,
        expires: result.expires,
      });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
