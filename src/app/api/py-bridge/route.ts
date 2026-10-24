import { NextRequest, NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:5000";

// POST — bridge to Python Pyrogram service
// body: { action: "scrape"|"add"|"send_message"|"account_info", accountId, ...params }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  if (user.role !== "admin" && user.status !== "approved") {
    return NextResponse.json({ ok: false, error: "حسابك بانتظار موافقة المطور" }, { status: 403 });
  }

  // Rate limit
  const rl = checkRateLimit(`pybridge:${user.id}`, RATE_LIMITS.execute.max, RATE_LIMITS.execute.windowMs);
  if (!rl.allowed) {
    const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { ok: false, error: `تجاوزت الحد المسموح. حاول بعد ${retryAfter} ثانية.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const { action, accountId } = body;

    if (!action) {
      return NextResponse.json({ ok: false, error: "action required" }, { status: 400 });
    }

    // ─── للحصول على session_string من DB ───
    let sessionString = "";
    let apiId: string | undefined;
    let apiHash: string | undefined;

    if (accountId) {
      await ensureSchema();
      const rows = await sql`SELECT session_string, api_id, api_hash FROM telegram_accounts WHERE id = ${accountId} AND owner_id = ${user.id}`;
      const account = (rows as any[])[0];
      if (!account) {
        return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
      }
      sessionString = account.session_string;
      apiId = account.api_id || undefined;
      apiHash = account.api_hash || undefined;
    }

    // ─── توجيه الطلب للـ Python service ───
    let pyEndpoint = "";
    let pyBody: any = { session_string: sessionString, api_id: apiId, api_hash: apiHash };

    switch (action) {
      case "scrape":
        pyEndpoint = "/scrape";
        pyBody.group_link = body.group_link || body.groupLink;
        pyBody.limit = body.limit || body.count || 100;
        pyBody.use_messages = body.use_messages || false;
        break;

      case "add":
        pyEndpoint = "/add";
        pyBody.target_group = body.target_group || body.targetGroup;
        pyBody.source_group = body.source_group || body.sourceGroup || "";
        pyBody.user_list = body.user_list || body.userList || "";
        pyBody.count = body.count || 50;
        pyBody.delay = body.delay || 3;
        pyBody.contact_recycle = body.contact_recycle !== false; // default true
        break;

      case "send_message":
        pyEndpoint = "/send_message";
        pyBody.target = body.target || body.groupLink;
        pyBody.message = body.message;
        pyBody.count = body.count || 1;
        pyBody.delay = body.delay || 3;
        break;

      case "account_info":
        pyEndpoint = "/account_info";
        break;

      case "send_code":
        // لا يحتاج session_string
        pyEndpoint = "/send_code";
        pyBody = { phone: body.phone, api_id: apiId, api_hash: apiHash };
        break;

      case "verify_code":
        pyEndpoint = "/verify_code";
        pyBody = {
          phone: body.phone,
          code: body.code,
          session_string: body.session_string || sessionString,
          phone_code_hash: body.phone_code_hash || body.phoneCodeHash,
          password: body.password || "",
        };
        break;

      default:
        return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }

    // ─── إرسال الطلب للـ Python service ───
    const pyResponse = await fetch(`${PYTHON_SERVICE_URL}${pyEndpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pyBody),
      signal: AbortSignal.timeout(280000), // 4.6 دقيقة كحد أقصى
    });

    const pyData = await pyResponse.json();
    return NextResponse.json(pyData);
  } catch (e: any) {
    console.error("[py-bridge] Error:", e);
    return NextResponse.json(
      { ok: false, error: `Python service error: ${e.message}. تأكد أن خدمة Python تعمل.` },
      { status: 500 }
    );
  }
}

// GET — health check of Python service
export async function GET() {
  try {
    const res = await fetch(`${PYTHON_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json({ ok: true, python: data });
  } catch {
    return NextResponse.json({
      ok: false,
      error: "Python service not running. شغّل: bash python-service/start.sh",
    }, { status: 503 });
  }
}
