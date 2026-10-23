import { TelegramClient, Api, sessions } from "telegram";

// نستخرج StringSession من نفس الـ module instance لتجنب مشكلة instanceof
// (مشكلة "Only StringSession and StoreSessions are supported currently :(")
// السبب: عند استيراد StringSession من "telegram/sessions" كمسار فرعي،
// يقوم Next.js بتحميل نسختين منفصلتين من GramJS بسبب serverExternalPackages،
// فيفشل فحص instanceof StringSession داخل GramJS.
const { StringSession } = sessions;

const DEFAULT_API_ID = Number(process.env.TELEGRAM_API_ID || "35923747");
const DEFAULT_API_HASH = process.env.TELEGRAM_API_HASH || "6de1cf34ed1e68d94615ba7b45391dde";

export function buildClient(sessionString: string, options?: {
  apiId?: number;
  apiHash?: string;
  proxy?: any;
}) {
  const session = new StringSession(sessionString || "");
  const opts: any = {
    connectionRetries: 5,
    retryDelay: 2,
    timeout: 30,
    requestRetries: 3,
    floodSleepThreshold: 60,
    useWSS: true,
  };
  if (options?.proxy) {
    opts.useWSS = false;
    opts.proxy = options.proxy;
  }
  return new TelegramClient(
    session,
    options?.apiId || DEFAULT_API_ID,
    options?.apiHash || DEFAULT_API_HASH,
    opts
  );
}

export async function sendCode(phone: string, apiId?: number, apiHash?: string) {
  const client = buildClient("", { apiId, apiHash });
  await client.connect();
  try {
    const result = await client.sendCode(
      { apiId: apiId || DEFAULT_API_ID, apiHash: apiHash || DEFAULT_API_HASH },
      phone
    );
    return {
      ok: true,
      sessionString: String(client.session.save() as any),
      phoneCodeHash: result.phoneCodeHash,
    };
  } catch (e: any) {
    return { ok: false, error: e.message?.substring(0, 200) };
  } finally {
    await client.disconnect();
  }
}

export async function verifyCode(
  phone: string,
  code: string,
  sessionString: string,
  phoneCodeHash: string,
  apiId?: number,
  apiHash?: string
) {
  const client = buildClient(sessionString, { apiId, apiHash });
  await client.connect();
  try {
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash,
        phoneCode: code,
      })
    );
    const me = await client.getMe();
    return {
      ok: true,
      sessionString: String(client.session.save() as any),
      user: {
        id: String(me.id),
        firstName: me.firstName || "",
        lastName: me.lastName || "",
        username: me.username || "",
      },
    };
  } catch (e: any) {
    if (e.message?.includes("SESSION_PASSWORD_NEEDED")) {
      return { ok: false, error: "2FA required", need2FA: true };
    }
    return { ok: false, error: e.message?.substring(0, 200) };
  } finally {
    await client.disconnect();
  }
}

export async function verify2FA(
  password: string,
  sessionString: string,
  apiId?: number,
  apiHash?: string
) {
  const client = buildClient(sessionString, { apiId, apiHash });
  await client.connect();
  try {
    await client.signInWithPassword(
      { apiId: apiId || DEFAULT_API_ID, apiHash: apiHash || DEFAULT_API_HASH },
      { password: () => Promise.resolve(password), onError: () => Promise.resolve(false) }
    );
    const me = await client.getMe();
    return {
      ok: true,
      sessionString: String(client.session.save() as any),
      user: {
        id: String(me.id),
        firstName: me.firstName || "",
        username: me.username || "",
      },
    };
  } catch (e: any) {
    return { ok: false, error: e.message?.substring(0, 200) };
  } finally {
    await client.disconnect();
  }
}

// ─── Import session helpers ──────────────────────────────
// يستورد جلسة تيليجرام موجودة (StringSession) ويتحقق من صحتها
export async function importSession(
  sessionString: string,
  apiId?: number,
  apiHash?: string
) {
  const cleaned = (sessionString || "").trim();
  if (!cleaned) {
    return { ok: false, error: "الجلسة فارغة" };
  }

  // GramJS StringSession تبدأ بـ "1" أو تكون Base64 طويل
  // Telethon StringSession تبدأ بـ "1" (v1) أو "2" (v2) أو تحوي "_"
  // سنحاول تشغيلها مباشرة؛ إن فشلت نعطي رسالة واضحة
  const client = buildClient(cleaned, { apiId, apiHash });
  try {
    await client.connect();
    if (!(await client.isUserAuthorized())) {
      await client.disconnect();
      return { ok: false, error: "الجلسة غير مصرّح بها (قد تكون قديمة أو غير صالحة)" };
    }
    const me: any = await client.getMe();
    return {
      ok: true,
      sessionString: String(client.session.save() as any),
      user: {
        id: String(me.id),
        firstName: me.firstName || "",
        lastName: me.lastName || "",
        username: me.username || "",
        phone: me.phone || "",
      },
    };
  } catch (e: any) {
    return { ok: false, error: e.message?.substring(0, 250) || "فشل التحقق من الجلسة" };
  } finally {
    try { await client.disconnect(); } catch {}
  }
}

// ─── Scrape helpers ──────────────────────────────────────
export async function scrapeGroupMembers(client: TelegramClient, groupInput: string, limit: number = 100) {
  try {
    const entity = await client.getEntity(groupInput);
    const participants = await client.getParticipants(entity, { limit });
    return participants.map((p: any) => ({
      id: String(p.id),
      access_hash: String(p.accessHash || ""),
      first_name: p.firstName || "",
      last_name: p.lastName || "",
      username: p.username || "",
      phone: p.phone || "",
      is_bot: !!p.bot,
      is_deleted: !!p.deleted,
    }));
  } catch (e: any) {
    throw new Error(e.message?.substring(0, 200));
  }
}

// ─── Add helpers ─────────────────────────────────────────
export async function addSingleMember(
  client: TelegramClient,
  targetGroup: string,
  user: { id: string; access_hash?: string }
) {
  try {
    const target = await client.getEntity(targetGroup);
    let inputUser: any;

    // Try access_hash first
    if (user.access_hash && user.access_hash !== "0") {
      inputUser = new Api.InputUser({
        userId: BigInt(user.id) as any,
        accessHash: BigInt(user.access_hash) as any,
      });
    } else {
      // Resolve fresh via getEntity
      const entity = await client.getEntity(BigInt(user.id) as any);
      inputUser = new Api.InputUser({
        userId: BigInt(user.id) as any,
        accessHash: (entity as any).accessHash || BigInt(0) as any,
      });
    }

    await client.invoke(
      new Api.channels.InviteToChannel({
        channel: target,
        users: [inputUser],
      })
    );
    return { ok: true, status: "ok" };
  } catch (e: any) {
    const msg = e.message || "";
    if (msg.includes("USER_ALREADY_PARTICIPANT")) return { ok: false, status: "already", reason: "موجود في القروب" };
    if (msg.includes("USER_PRIVACY")) return { ok: false, status: "skip", reason: "خصوصية المستخدم" };
    if (msg.includes("PEER_FLOOD") || msg.includes("FLOOD_WAIT")) {
      const m = msg.match(/FLOOD_WAIT_(\d+)/);
      return { ok: false, status: "flood", reason: m ? `انتظر ${m[1]}s` : "PeerFlood" };
    }
    if (msg.includes("CHAT_ADMIN_REQUIRED")) return { ok: false, status: "skip", reason: "تتطلب صلاحية أدمن" };
    if (msg.includes("CHAT_WRITE_FORBIDDEN")) return { ok: false, status: "skip", reason: "لا صلاحية كتابة" };
    return { ok: false, status: "error", reason: msg.substring(0, 80) };
  }
}

export function smartDelay(base: number = 3): Promise<void> {
  const ms = Math.max(base * (Math.random() * 1.4 + 0.3), 0.5) * 1000;
  return new Promise(r => setTimeout(r, ms));
}
