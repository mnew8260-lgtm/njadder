import { TelegramClient, Api, sessions } from "telegram";
import { SERVER_CONFIG } from "./config";

// نستخرج StringSession من نفس الـ module instance لتجنب مشكلة instanceof
// (مشكلة "Only StringSession and StoreSessions are supported currently :(")
const { StringSession } = sessions;

const DEFAULT_API_ID = Number(SERVER_CONFIG.telegramApiId);
const DEFAULT_API_HASH = SERVER_CONFIG.telegramApiHash;

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
    try { await client.disconnect(); } catch (e: any) { /* ignore */ }
  }
}

// ─── Scrape helpers ──────────────────────────────────────
export async function scrapeGroupMembers(client: TelegramClient, groupInput: string, limit: number = 100) {
  try {
    // استخدم resolveChannelEntity لدعم الروابط الخاصة أيضاً
    const entity = await resolveChannelEntity(client, groupInput);
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

/**
 * يحوّل أي رابط/يوزر لمجموعة إلى InputChannel جاهز للاستخدام.
 * - للروابط الخاصة (+abc): ينضم أولاً ثم يحلّ
 * - للـ @usernames: يحلّ مباشرة
 * - لـ t.me/+hash: ينضم ثم يحلّ
 * - لـ IDs: يحاول resolve مباشرة
 *
 * @returns InputChannel | Entity (channel-like)
 */
export async function resolveChannelEntity(client: TelegramClient, input: string): Promise<any> {
  const trimmed = (input || "").trim();
  if (!trimmed) throw new Error("رابط فارغ");

  // محاولة 1: resolve مباشر (للـ @usernames والـ IDs والروابط العادية)
  try {
    const entity = await client.getEntity(trimmed);
    return entity;
  } catch (e1: any) {
    const msg1 = e1.message || "";

    // محاولة 2: لو رابط دعوة خاص (t.me/+hash) → join ثم resolve
    if (trimmed.includes("t.me/+") || trimmed.includes("t.me/joinchat/")) {
      let hash = "";
      if (trimmed.includes("t.me/+")) {
        hash = trimmed.split("t.me/+")[1]?.split(/[?\s]/)[0] || "";
      } else if (trimmed.includes("t.me/joinchat/")) {
        hash = trimmed.split("t.me/joinchat/")[1]?.split(/[?\s]/)[0] || "";
      }

      if (hash) {
        // محاولة الانضمام (لو منضم بالفعل سيعطي خطأ نتجاهله)
        try {
          await client.invoke(new Api.messages.ImportChatInvite({ hash }));
        } catch (joinErr: any) {
          // تجاهل: "USER_ALREADY_PARTICIPANT" أو غيره
        }

        // انتظر قليلاً ثم حاول resolve مرة أخرى
        await new Promise(r => setTimeout(r, 1500));

        // ابحث عن أحدث قروب خاص انضممنا إليه
        try {
          const dialogs = await client.getDialogs({ limit: 50 });
          const recent = (dialogs as any[]).find(d =>
            d.entity && (
              (d.entity.className === "Chat" && d.entity.left !== true) ||
              d.entity.className === "Channel"
            )
          );
          if (recent?.entity) return recent.entity;
        } catch (e3: any) {
          // ignore
        }

        // محاولة أخيرة: getEntity بعد الـ join
        try {
          const entity2 = await client.getEntity(trimmed);
          return entity2;
        } catch (e4: any) {
          // ignore
        }

        throw new Error(`تعذّر الوصول للمجموعة الخاصة. تأكد أن الرابط صالح وأن حسابك ليس محظوراً. التفاصيل: ${msg1.substring(0, 80)}`);
      }
    }

    // محاولة 3: استخراج username من الرابط (لو t.me/username)
    if (trimmed.includes("t.me/")) {
      const username = trimmed.split("t.me/")[1]?.split(/[?/\s]/)[0];
      if (username && !username.startsWith("+")) {
        try {
          const entity = await client.getEntity(`@${username}`);
          return entity;
        } catch (e2: any) {
          throw new Error(`تعذّر حلّ الكيان: ${e2.message?.substring(0, 80)}`);
        }
      }
    }

    throw new Error(`تعذّر الوصول للمجموعة: ${msg1.substring(0, 80)}`);
  }
}

/**
 * إضافة عضو واحد لمجموعة (يقبل target كـ entity جاهز لتفادي getEntity المتكرر).
 * يحاول 4 طرق للإضافة لزيادة نسبة النجاح.
 */
export async function addSingleMember(
  client: TelegramClient,
  targetGroup: any,
  user: { id: string; access_hash?: string; username?: string; first_name?: string }
) {
  let target: any = targetGroup;
  // حلّ الـ target مرة واحدة (لو string)
  if (typeof targetGroup === "string") {
    try {
      target = await resolveChannelEntity(client, targetGroup);
    } catch (e: any) {
      return { ok: false, status: "error", reason: `تعذّر حلّ الهدف: ${e.message?.substring(0, 60)}` };
    }
  }

  // ─── محاولة 1: InputUser مع access_hash ───
  if (user.access_hash && user.access_hash !== "0") {
    try {
      const inputUser = new Api.InputUser({
        userId: BigInt(user.id) as any,
        accessHash: BigInt(user.access_hash) as any,
      });
      await client.invoke(
        new Api.channels.InviteToChannel({
          channel: target,
          users: [inputUser],
        })
      );
      return { ok: true, status: "ok" };
    } catch (e: any) {
      // فشلت المحاولة الأولى، ننتقل للتالية
    }
  }

  // ─── محاولة 2: resolve من getEntity ثم InputUser ───
  try {
    const entity = await client.getEntity(BigInt(user.id) as any);
    const inputUser = new Api.InputUser({
      userId: BigInt(user.id) as any,
      accessHash: (entity as any).accessHash || BigInt(0) as any,
    });
    await client.invoke(
      new Api.channels.InviteToChannel({
        channel: target,
        users: [inputUser],
      })
    );
    return { ok: true, status: "ok" };
  } catch (e: any) {
    // ننتقل للتالية
  }

  // ─── محاولة 3: استخدام username (لو متوفر) ───
  if (user.username && user.username.startsWith("@")) {
    try {
      const userEntity = await client.getEntity(user.username);
      const inputUser = new Api.InputUser({
        userId: BigInt((userEntity as any).id) as any,
        accessHash: (userEntity as any).accessHash || BigInt(0) as any,
      });
      await client.invoke(
        new Api.channels.InviteToChannel({
          channel: target,
          users: [inputUser],
        })
      );
      return { ok: true, status: "ok" };
    } catch (e: any) {
      // ننتقل للتالية
    }
  }

  // ─── محاولة 4: تمرير ID مباشرة كـ InputUser مع access_hash = 0 ───
  try {
    const inputUser = new Api.InputUser({
      userId: BigInt(user.id) as any,
      accessHash: BigInt(0) as any,
    });
    await client.invoke(
      new Api.channels.InviteToChannel({
        channel: target,
        users: [inputUser],
      })
    );
    return { ok: true, status: "ok" };
  } catch (e: any) {
    return parseAddError(e);
  }
}

/**
 * يحوّل خطأ تيليجرام لرسالة عربية مفهومة + status code.
 */
function parseAddError(e: any): { ok: false; status: string; reason: string } {
  const msg = (e.message || "").toString();
  if (msg.includes("USER_ALREADY_PARTICIPANT")) return { ok: false, status: "already", reason: "موجود في القروب" };
  if (msg.includes("USER_PRIVACY") || msg.includes("PRIVACY")) return { ok: false, status: "skip", reason: "خصوصية المستخدم تمنع الإضافة" };
  if (msg.includes("PEER_FLOOD") || msg.includes("FLOOD_WAIT")) {
    const m = msg.match(/FLOOD_WAIT_(\d+)/);
    return { ok: false, status: "flood", reason: m ? `انتظر ${m[1]}s` : "PeerFlood — راجع بعد ساعات" };
  }
  if (msg.includes("CHAT_ADMIN_REQUIRED")) return { ok: false, status: "skip", reason: "تتطلب صلاحية أدمن" };
  if (msg.includes("CHAT_WRITE_FORBIDDEN")) return { ok: false, status: "skip", reason: "لا صلاحية كتابة" };
  if (msg.includes("USER_NOT_MUTUAL_CONTACT")) return { ok: false, status: "skip", reason: "ليس جهة اتصال متبادلة" };
  if (msg.includes("USER_ID_INVALID")) return { ok: false, status: "skip", reason: "معرّف مستخدم غير صالح" };
  if (msg.includes("BOT_METHOD_INVALID")) return { ok: false, status: "skip", reason: "لا يمكن إضافة بوت" };
  if (msg.includes("INPUT_USER_DEACTIVATED")) return { ok: false, status: "skip", reason: "حساب محذوف" };
  if (msg.includes("PEER_ID_INVALID")) return { ok: false, status: "skip", reason: "معرّف القروب غير صالح" };
  if (msg.includes("CHANNEL_PRIVATE") || msg.includes("CHAT_PRIVATE")) return { ok: false, status: "skip", reason: "القروب خاص" };
  if (msg.includes("USER_BLOCKED")) return { ok: false, status: "skip", reason: "المستخدم محظور" };
  return { ok: false, status: "skip", reason: msg.substring(0, 60) || "تعذّر الإضافة" };
}

export function smartDelay(base: number = 3): Promise<void> {
  const ms = Math.max(base * (Math.random() * 1.4 + 0.3), 0.5) * 1000;
  return new Promise(r => setTimeout(r, ms));
}
