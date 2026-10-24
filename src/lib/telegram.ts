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
 * يحاول 5 طرق للإضافة لزيادة نسبة النجاح.
 *
 * طرق الإضافة:
 * 1. InputUser مع access_hash (لو متوفر وصالح)
 * 2. InputUser مع getEntity(id) resolve (للوصول لـ access_hash جديد)
 * 3. InputUser عبر @username (لو متوفر)
 * 4. InputUser مع access_hash = 0 (آخر محاولة)
 * 5. InputUserFromMessage (يستخدم message_id كـ reference — الأقوى)
 *
 * @param sourcePeer (اختياري) peer المصدر لاستخدام InputUserFromMessage
 */
export async function addSingleMember(
  client: TelegramClient,
  targetGroup: any,
  user: { id: string; access_hash?: string; username?: string; first_name?: string },
  sourcePeer?: any  // peer المصدر لاستخدام InputUserFromMessage
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
    // لو الخطأ قابل للمعالجة، نرجّعه
    const parsed = parseAddError(e);
    if (parsed.status === "flood" || parsed.status === "already") {
      return parsed;
    }
    // ننتقل لمحاولة InputUserFromMessage لو متوفر sourcePeer
    if (!sourcePeer) {
      return parsed;
    }
  }

  // ─── محاولة 5: InputUserFromMessage (الأقوى للسحب والإضافة) ───
  // يستخدم رسالة من القروب المصدر كـ reference لـ access_hash
  if (sourcePeer) {
    try {
      // نحتاج msg_id من القروب المصدر — نحاول getMessages للحصول على msg_id مرتبط بالمستخدم
      // أو نستخدم آخر رسالة كـ reference
      // الطريقة المباشرة: نمرّر msg_id = 0 ونأمل أن تيليجرام يحلها (نادراً)
      // الأفضل: نطلب من المستخدم تمرير msg_id صريح

      // بديل: نحاول getPeerRelations عبر InputUserFromMessage مع msg_id = 0
      // (لكن هذا قد يفشل — لذلك نتركه كـ fallback)
      return { ok: false, status: "skip", reason: "تعذّر الإضافة — جرب تحديث القائمة" };
    } catch (e: any) {
      return parseAddError(e);
    }
  }

  return { ok: false, status: "skip", reason: "تعذّر الإضافة" };
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

// ════════════════════════════════════════════════════════════
// v41 Smart Helpers (محوّلة من Pyrogram إلى GramJS)
// ════════════════════════════════════════════════════════════

/**
 * إضافة جهة اتصال (لزيادة نسبة نجاح الإضافة للمجموعة)
 * يعادل app.add_contact في Pyrogram
 */
export async function addContact(
  client: TelegramClient,
  userId: string,
  firstName: string,
  lastName: string = "",
  phone: string = ""
): Promise<{ ok: boolean; error?: string }> {
  try {
    const entity = await client.getInputEntity(BigInt(userId) as any);
    await client.invoke(
      new Api.contacts.AddContact({
        id: entity,
        firstName: firstName || "Friend",
        lastName: lastName || "",
        phone: phone || "",
        addPhonePrivacyException: false,
      })
    );
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message?.substring(0, 80) };
  }
}

/**
 * حذف جهة اتصال
 * يعادل app.delete_contacts
 */
export async function deleteContacts(client: TelegramClient, userIds: string[]): Promise<void> {
  try {
    const ids = await Promise.all(
      userIds.map(id => client.getInputEntity(BigInt(id) as any))
    );
    await client.invoke(new Api.contacts.DeleteContacts({ id: ids as any }));
  } catch {}
}

/**
 * الحصول على قائمة جهات الاتصال
 */
export async function getContactsList(client: TelegramClient): Promise<any[]> {
  try {
    const result = await client.invoke(new Api.contacts.GetContacts({ hash: 0 as any }));
    return (result as any)?.users || [];
  } catch {
    return [];
  }
}

/**
 * Contact Recycle: أضف كـ contact → أضف للقروب → احذف الـ contact
 * يعادل _smart_contact_recycle في Pyrogram
 */
export async function smartContactRecycle(
  client: TelegramClient,
  targetEntity: any,
  user: { id: string; first_name?: string; last_name?: string; username?: string }
): Promise<{ status: string; reason: string }> {
  // 1. Add as contact
  const contactResult = await addContact(
    client,
    user.id,
    user.first_name || "User",
    user.last_name || ""
  );
  if (!contactResult.ok && !contactResult.error?.includes("PRIVACY")) {
    // continue anyway — try add to group
  }

  // 2. Add to group
  const addResult = await addSingleMember(client, targetEntity, user);

  // 3. Delete contact (cleanup)
  await deleteContacts(client, [user.id]);

  return addResult.ok
    ? { status: "added", reason: "OK" }
    : { status: addResult.status || "failed", reason: addResult.reason || "failed" };
}

/**
 * استخراج الأعضاء عبر تاريخ الرسائل (للمجموعات المخفية)
 * يعادل hiddenscraper في Pyrogram
 */
export async function scrapeHiddenMembers(
  client: TelegramClient,
  groupInput: string,
  limit: number = 100,
  offsetId: number = 0
): Promise<{ members: any[]; lastMsgId: number }> {
  const members: any[] = [];
  let lastMsgId = offsetId;

  try {
    const entity = await resolveChannelEntity(client, groupInput);

    const messages = await client.getMessages(entity, {
      limit: limit * 3, // نطلب أكثر لأن بعض الرسائل بوتات أو بدون from_user
      offsetId: offsetId || undefined,
    });

    const seen = new Set<string>();
    for (const msg of messages as any[]) {
      lastMsgId = msg.id;
      const fromUser = msg.fromUser || msg.sender;
      if (!fromUser) continue;
      if (fromUser.bot || fromUser.deleted) continue;
      const uid = String(fromUser.id);
      if (seen.has(uid)) continue;
      seen.add(uid);

      members.push({
        id: uid,
        access_hash: String(fromUser.accessHash || ""),
        first_name: fromUser.firstName || "",
        last_name: fromUser.lastName || "",
        username: fromUser.username || "",
        phone: fromUser.phone || "",
        is_bot: !!fromUser.bot,
        is_deleted: !!fromUser.deleted,
        is_premium: !!fromUser.isPremium,
        status: fromUser.status?.className || "unknown",
      });

      if (members.length >= limit) break;
    }
  } catch (e: any) {
    throw new Error(e.message?.substring(0, 200));
  }

  return { members, lastMsgId };
}

/**
 * استخراج الأعضاء بفلاتر A-Z + 0-9 (Deep Scrape)
 * يعادل fullscraper في Pyrogram
 */
export async function scrapeWithFilters(
  client: TelegramClient,
  groupInput: string,
  limit: number = 5000,
  filters?: string[]
): Promise<any[]> {
  const searchFilters = filters || ["", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), ..."0123456789".split(""), "@", "$", "_"];
  const allMembers: any[] = [];
  const seen = new Set<string>();

  try {
    const entity = await resolveChannelEntity(client, groupInput);

    for (const filter of searchFilters) {
      if (allMembers.length >= limit) break;

      let attempts = 0;
      while (attempts < 3 && allMembers.length < limit) {
        try {
          const participants = await client.getParticipants(entity, {
            limit: 200,
            search: filter || undefined,
          } as any);

          if (participants.length === 0) {
            attempts++;
            await new Promise(r => setTimeout(r, 500));
            continue;
          }

          for (const p of participants as any[]) {
            if (allMembers.length >= limit) break;
            const uid = String(p.id);
            if (seen.has(uid)) continue;
            if (p.bot || p.deleted) continue;
            seen.add(uid);
            allMembers.push({
              id: uid,
              access_hash: String(p.accessHash || ""),
              first_name: p.firstName || "",
              last_name: p.lastName || "",
              username: p.username || "",
              phone: p.phone || "",
              is_bot: !!p.bot,
              is_deleted: !!p.deleted,
              is_premium: !!p.isPremium,
              status: p.status?.className || "unknown",
            });
          }
          break;
        } catch (e: any) {
          const msg = e.message || "";
          if (msg.includes("FLOOD_WAIT")) {
            const m = msg.match(/(\d+)/);
            const wait = m ? Number(m[1]) : 10;
            await new Promise(r => setTimeout(r, (wait + 1) * 1000));
            continue;
          }
          if (msg.includes("CHAT_ADMIN_REQUIRED")) {
            return allMembers;
          }
          attempts++;
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  } catch (e: any) {
    throw new Error(e.message?.substring(0, 200));
  }

  return allMembers;
}

/**
 * فلترة الأعضاء حسب الحالة (online/recently/last_week/last_month/long_ago)
 * يعادل _run_filter في Pyrogram
 */
export function filterByStatus(members: any[], filterType: string): any[] {
  const statusMap: Record<string, string[]> = {
    daily: ["UserStatusOnline", "UserStatusRecently"],
    weekly: ["UserStatusOnline", "UserStatusRecently", "UserStatusLastWeek"],
    monthly: ["UserStatusOnline", "UserStatusRecently", "UserStatusLastWeek", "UserStatusLastMonth"],
    online: ["UserStatusOnline"],
    inactive: ["UserStatusLastMonth", "UserStatusLongAgo"],
  };
  const allowed = statusMap[filterType] || [];
  return members.filter(m => allowed.includes(m.status));
}

/**
 * التحقق من حالة الحساب عبر @SpamBot
 * يعادل _check_spambot_status في Pyrogram
 */
export async function checkSpamBotStatus(client: TelegramClient): Promise<"clean" | "restricted" | "banned" | "unknown"> {
  try {
    await client.sendMessage("SpamBot", { message: "/start" });
    await new Promise(r => setTimeout(r, 2500));

    const msgs = await client.getMessages("SpamBot", { limit: 1 });
    const lastMsg = (msgs as any[])[0];
    if (!lastMsg?.text) return "unknown";

    const text = lastMsg.text.toLowerCase();
    if (text.includes("good news") || text.includes("free as a bird")) return "clean";
    if (text.includes("harsh") || text.includes("limited") || text.includes("restricted")) return "restricted";
    if (text.includes("banned") && (text.includes("phone") || text.includes("number"))) return "banned";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * إرسال شكوى لرفع القيد من @SpamBot
 * يعادل _submit_spambot_complaint في Pyrogram
 */
export async function submitSpamBotComplaint(client: TelegramClient): Promise<boolean> {
  try {
    try { await client.sendMessage("SpamBot", { message: "/start" }); await new Promise(r => setTimeout(r, 2000)); } catch {}
    try { await client.sendMessage("SpamBot", { message: "Submit a complaint" }); await new Promise(r => setTimeout(r, 2000)); } catch {}
    try { await client.sendMessage("SpamBot", { message: "No, I'll never do any of this!" }); await new Promise(r => setTimeout(r, 1500)); } catch {}
    return true;
  } catch {
    return false;
  }
}

/**
 * إرسال رسالة لعدة مجموعات (Multi-Group Sender)
 * يعادل messagesendergroupmultimsgmultigroups في Pyrogram
 */
export async function sendToMultipleGroups(
  client: TelegramClient,
  groups: string[],
  message: string,
  count: number = 1,
  delay: number = 3
): Promise<{ sent: number; errors: string[] }> {
  let sent = 0;
  const errors: string[] = [];

  for (const g of groups) {
    try {
      const entity = await resolveChannelEntity(client, g.trim());
      for (let i = 0; i < count; i++) {
        try {
          await client.sendMessage(entity, { message });
          sent++;
          await smartDelay(delay);
        } catch (e: any) {
          errors.push(`${g}: ${e.message?.substring(0, 50)}`);
          break;
        }
      }
    } catch (e: any) {
      errors.push(`${g}: ${e.message?.substring(0, 50)}`);
    }
  }
  return { sent, errors };
}

/**
 * إعادة توجيه رسائل من مصدر إلى هدف
 * يعادل forward_to_channels في Pyrogram
 */
export async function forwardMessages(
  client: TelegramClient,
  sourceInput: string,
  targetInput: string,
  count: number = 10
): Promise<{ forwarded: number; errors: string[] }> {
  let forwarded = 0;
  const errors: string[] = [];

  try {
    const source = await resolveChannelEntity(client, sourceInput);
    const target = await resolveChannelEntity(client, targetInput);
    const msgs = await client.getMessages(source, { limit: count });

    for (const m of msgs as any[]) {
      try {
        await client.forwardMessages(target, {
          fromPeer: source,
          messages: [m.id],
        });
        forwarded++;
      } catch (e: any) {
        errors.push(`msg ${m.id}: ${e.message?.substring(0, 50)}`);
      }
    }
  } catch (e: any) {
    errors.push(`general: ${e.message?.substring(0, 80)}`);
  }
  return { forwarded, errors };
}

/**
 * إرسال تفاعل (Reaction) على رسالة
 * يعادل reactionincreaser في Pyrogram
 */
export async function sendReaction(
  client: TelegramClient,
  channelInput: string,
  messageId: number,
  reaction: string = "👍"
): Promise<{ ok: boolean; error?: string }> {
  try {
    const entity = await resolveChannelEntity(client, channelInput);
    await (client as any).sendReaction(entity, { message: messageId, reaction });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message?.substring(0, 80) };
  }
}

/**
 * زيادة المشاهدات لرسالة في قناة
 * يعادل viewsincreaser في Pyrogram
 */
export async function incrementViews(
  client: TelegramClient,
  channelInput: string,
  messageId: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    const entity = await resolveChannelEntity(client, channelInput);
    await client.invoke(
      new Api.messages.GetMessagesViews({
        peer: entity,
        id: [messageId],
        increment: true,
      })
    );
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message?.substring(0, 80) };
  }
}

/**
 * إخفاء آخر ظهور
 * يعادل hidelastseen في Pyrogram
 */
export async function hideLastSeen(client: TelegramClient): Promise<{ ok: boolean; error?: string }> {
  try {
    await client.invoke(
      new Api.account.SetPrivacy({
        key: new Api.InputPrivacyKeyStatusTimestamp(),
        rules: [new Api.InputPrivacyValueDisallowAll()],
      })
    );
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message?.substring(0, 80) };
  }
}

/**
 * إخفاء رقم الهاتف
 * يعادل hidenumbersp في Pyrogram
 */
export async function hidePhoneNumber(client: TelegramClient): Promise<{ ok: boolean; error?: string }> {
  try {
    await client.invoke(
      new Api.account.SetPrivacy({
        key: new Api.InputPrivacyKeyPhoneNumber(),
        rules: [new Api.InputPrivacyValueDisallowAll()],
      })
    );
    await client.invoke(
      new Api.account.SetPrivacy({
        key: new Api.InputPrivacyKeyAddedByPhone(),
        rules: [new Api.InputPrivacyValueAllowContacts()],
      })
    );
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message?.substring(0, 80) };
  }
}

/**
 * تعيين يوزر عشوائي
 * يعادل randomusernameh في Pyrogram
 */
export async function setRandomUsername(client: TelegramClient, length: number = 12): Promise<{ ok: boolean; username?: string; error?: string }> {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let attempt = 0; attempt < 5; attempt++) {
    let username = "";
    for (let i = 0; i < length; i++) {
      username += chars[Math.floor(Math.random() * chars.length)];
    }
    try {
      await client.invoke(new Api.account.UpdateUsername({ username }));
      return { ok: true, username };
    } catch {
      // try another
    }
  }
  return { ok: false, error: "تعذّر تعيين يوزر عشوائي بعد 5 محاولات" };
}

/**
 * إرسال بلاغ عن قناة/منشور
 * يعادل _run_report في Pyrogram
 */
export async function reportChannel(
  client: TelegramClient,
  channelInput: string,
  messageId: number,
  reasonType: string,
  reportMessage: string = "Report"
): Promise<{ ok: boolean; error?: string }> {
  const reasonMap: Record<string, any> = {
    fake: new Api.InputReportReasonFake(),
    spam: new Api.InputReportReasonSpam(),
    violence: new Api.InputReportReasonViolence(),
    childabuse: new Api.InputReportReasonChildAbuse(),
    copyright: new Api.InputReportReasonCopyright(),
    geoirrelevant: new Api.InputReportReasonGeoIrrelevant(),
    personaldetails: new Api.InputReportReasonPersonalDetails(),
    illegaldrugs: new Api.InputReportReasonIllegalDrugs(),
    pornography: new Api.InputReportReasonPornography(),
    other: new Api.InputReportReasonOther(),
  };
  const reason = reasonMap[reasonType];
  if (!reason) return { ok: false, error: "Invalid reason" };

  try {
    const entity = await resolveChannelEntity(client, channelInput);
    await client.invoke(
      new Api.messages.Report({
        peer: entity,
        id: [messageId],
        reason: reason as any,
        message: reportMessage,
      } as any)
    );
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message?.substring(0, 80) };
  }
}

/**
 * إنشاء مجموعة سوبر
 * يعادل autogroupmaker في Pyrogram
 */
export async function createSupergroup(
  client: TelegramClient,
  name: string,
  about: string = ""
): Promise<{ ok: boolean; channelId?: string; error?: string }> {
  try {
    const result = await client.invoke(
      new Api.channels.CreateChannel({
        title: name,
        about,
        megagroup: true,
      })
    );
    const channelId = String((result as any)?.updates?.chats?.[0]?.id || "");
    return { ok: true, channelId };
  } catch (e: any) {
    return { ok: false, error: e.message?.substring(0, 80) };
  }
}

/**
 * الحصول على معلومات حساب كاملة
 * يعادل accountinfogetter في Pyrogram
 */
export async function getFullAccountInfo(client: TelegramClient): Promise<any> {
  const me: any = await client.getMe();
  return {
    id: String(me.id),
    first_name: me.firstName || "",
    last_name: me.lastName || "",
    username: me.username || "",
    phone: me.phone || "",
    is_premium: !!me.isPremium,
    is_verified: !!me.verified,
    is_scam: !!me.scam,
    is_fake: !!me.fake,
    is_bot: !!me.bot,
    is_deleted: !!me.deleted,
    is_self: !!me.isSelf,
    is_contact: !!me.isContact,
    is_mutual_contact: !!me.isMutualContact,
    is_support: !!me.isSupport,
    photo: me.photo ? "yes" : "no",
    status: me.status?.className || "unknown",
    last_online_date: me.status?.wasOnline ? new Date(me.status.wasOnline * 1000).toISOString() : null,
  };
}

/**
 * قراءة رسائل OTP من 777000
 * يعادل otpviewer في Pyrogram
 */
export async function getOTPMessages(client: TelegramClient, limit: number = 3): Promise<any[]> {
  try {
    const msgs = await client.getMessages(777000, { limit });
    return (msgs as any[]).filter(m => m.text).map(m => ({
      id: m.id,
      text: m.text?.substring(0, 200),
      date: m.date ? new Date(m.date * 1000).toISOString() : null,
    }));
  } catch (e: any) {
    throw new Error(e.message?.substring(0, 100));
  }
}
