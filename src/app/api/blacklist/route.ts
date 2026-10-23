import { NextRequest, NextResponse } from "next/server";
import { BlacklistService } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireApproved() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 }), user: null };
  if (user.role !== "admin" && user.status !== "approved") {
    return { error: NextResponse.json({ ok: false, error: "Account pending approval", needsApproval: true }, { status: 403 }), user: null };
  }
  return { error: null, user };
}

// GET — list user's blacklist
export async function GET() {
  const { error, user } = await requireApproved();
  if (error || !user) return error;
  try {
    const items = await BlacklistService.list(user.id);
    const count = await BlacklistService.count(user.id);
    return NextResponse.json({ ok: true, items, count });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// POST — add single / bulk / clear
export async function POST(req: NextRequest) {
  const { error, user } = await requireApproved();
  if (error || !user) return error;
  try {
    const body = await req.json();
    const { action, telegramId, reason, fullName, username, bulkText } = body;

    if (action === "add") {
      if (!telegramId) return NextResponse.json({ ok: false, error: "telegramId required" }, { status: 400 });
      const r = await BlacklistService.add(user.id, String(telegramId), { reason, fullName, username, addedBy: "manual" });
      return NextResponse.json(r);
    }

    if (action === "bulk") {
      if (!bulkText) return NextResponse.json({ ok: false, error: "bulkText required" }, { status: 400 });
      const r = await BlacklistService.addBulk(user.id, String(bulkText), reason);
      return NextResponse.json({ ok: true, ...r });
    }

    if (action === "clear") {
      const n = await BlacklistService.clear(user.id);
      return NextResponse.json({ ok: true, cleared: n });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// DELETE — remove single item
export async function DELETE(req: NextRequest) {
  const { error, user } = await requireApproved();
  if (error || !user) return error;
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    await BlacklistService.remove(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
