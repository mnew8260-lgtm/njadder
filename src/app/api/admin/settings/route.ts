import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSettings, updateSettings, AppSettings } from "@/lib/subscription";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — جلب الإعدادات (admin فقط)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });

  try {
    const settings = await getSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// POST — تحديث الإعدادات (admin فقط)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });

  try {
    const updates: Partial<AppSettings> = await req.json();
    await updateSettings(updates, user.id);
    const settings = await getSettings();
    return NextResponse.json({ ok: true, settings, message: "تم تحديث الإعدادات" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
