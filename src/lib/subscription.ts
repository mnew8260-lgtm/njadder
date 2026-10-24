// ════════════════════════════════════════════════════════════
// NJADDER PRO v12.0 SaaS — Subscription & Trial Management
// ════════════════════════════════════════════════════════════
import { sql, ensureSchema } from "./db";

// ─── Types ────────────────────────────────────────────────
export type SubscriptionState = "trial" | "active" | "expired" | "banned" | "pending";
export type PlanKey = "1m" | "3m" | "1y";

export interface SubscriptionStatus {
  state: SubscriptionState;
  daysLeft: number;
  hoursLeft: number;
  trialEndsAt: number;
  subscriptionEndsAt: number;
  plan: string | null;
  bannedReason?: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  username: string;
  plan: PlanKey;
  amount: number;
  duration_days: number;
  status: "pending" | "confirmed" | "rejected";
  payment_link: string;
  notes: string;
  created_at: number;
  confirmed_at: number;
  confirmed_by: string;
  rejection_reason: string;
}

export interface AppSettings {
  payment_link: string;
  price_1m: number;
  price_3m: number;
  price_1y: number;
  trial_days: number;
  currency: string;
}

// ─── Plan Config ──────────────────────────────────────────
export const PLAN_CONFIG: Record<PlanKey, { name: string; durationDays: number; priceKey: string; icon: string }> = {
  "1m": { name: "شهر واحد", durationDays: 30, priceKey: "price_1m", icon: "📅" },
  "3m": { name: "3 أشهر", durationDays: 90, priceKey: "price_3m", icon: "🗓️" },
  "1y": { name: "سنة كاملة", durationDays: 365, priceKey: "price_1y", icon: "👑" },
};

// ─── Settings helpers ─────────────────────────────────────
export async function getSettings(): Promise<AppSettings> {
  await ensureSchema();
  const rows = await sql`SELECT key, value FROM settings`;
  const map: Record<string, string> = {};
  for (const r of rows as any[]) {
    map[r.key] = r.value;
  }
  return {
    payment_link: map.payment_link || "https://t.me/your_payment_username",
    price_1m: Number(map.price_1m || 100),
    price_3m: Number(map.price_3m || 200),
    price_1y: Number(map.price_1y || 500),
    trial_days: Number(map.trial_days || 3),
    currency: map.currency || "USD",
  };
}

export async function updateSettings(updates: Partial<AppSettings>, updatedBy: string): Promise<void> {
  await ensureSchema();
  const map: Record<string, any> = {
    payment_link: updates.payment_link,
    price_1m: updates.price_1m?.toString(),
    price_3m: updates.price_3m?.toString(),
    price_1y: updates.price_1y?.toString(),
    trial_days: updates.trial_days?.toString(),
    currency: updates.currency,
  };
  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined && value !== null) {
      await sql`
        INSERT INTO settings (key, value, updated_at, updated_by)
        VALUES (${key}, ${value}, ${Date.now()}, ${updatedBy})
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = EXCLUDED.updated_at,
          updated_by = EXCLUDED.updated_by
      `;
    }
  }
}

// ─── Subscription status ──────────────────────────────────
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  await ensureSchema();
  const rows = await sql`
    SELECT role, status, banned, banned_reason,
           trial_starts_at, trial_expires_at,
           subscription_plan, subscription_expires
    FROM users WHERE id = ${userId}
  `;
  const u = (rows as any[])[0];
  if (!u) {
    return {
      state: "banned",
      daysLeft: 0,
      hoursLeft: 0,
      trialEndsAt: 0,
      subscriptionEndsAt: 0,
      plan: null,
    };
  }

  // الأدمن دائماً active
  if (u.role === "admin") {
    return {
      state: "active",
      daysLeft: 9999,
      hoursLeft: 0,
      trialEndsAt: 0,
      subscriptionEndsAt: 0,
      plan: "admin",
    };
  }

  // لو محظور
  if (u.banned) {
    return {
      state: "banned",
      daysLeft: 0,
      hoursLeft: 0,
      trialEndsAt: 0,
      subscriptionEndsAt: 0,
      plan: null,
      bannedReason: u.banned_reason || "تم حظرك من قبل الإدارة",
    };
  }

  // لو لم تتم الموافقة بعد
  if (u.status === "pending") {
    return {
      state: "pending",
      daysLeft: 0,
      hoursLeft: 0,
      trialEndsAt: 0,
      subscriptionEndsAt: 0,
      plan: null,
    };
  }
  if (u.status === "rejected") {
    return {
      state: "banned",
      daysLeft: 0,
      hoursLeft: 0,
      trialEndsAt: 0,
      subscriptionEndsAt: 0,
      plan: null,
      bannedReason: "تم رفض حسابك",
    };
  }

  const now = Date.now();
  const subExpires = Number(u.subscription_expires || 0);

  // لو عنده اشتراك فعال
  if (subExpires > now) {
    const daysLeft = Math.ceil((subExpires - now) / (24 * 60 * 60 * 1000));
    const hoursLeft = Math.ceil((subExpires - now) / (60 * 60 * 1000));
    return {
      state: "active",
      daysLeft,
      hoursLeft,
      trialEndsAt: 0,
      subscriptionEndsAt: subExpires,
      plan: u.subscription_plan || "premium",
    };
  }

  // لو انتهى اشتراكه، نتحقق من التجربة
  let trialStartsAt = Number(u.trial_starts_at || 0);
  let trialExpiresAt = Number(u.trial_expires_at || 0);

  // لو ما بدأت التجربة بعد، نبدأها الآن
  if (trialStartsAt === 0) {
    const settings = await getSettings();
    const trialDays = settings.trial_days;
    trialStartsAt = now;
    trialExpiresAt = now + trialDays * 24 * 60 * 60 * 1000;
    await sql`
      UPDATE users
      SET trial_starts_at = ${trialStartsAt}, trial_expires_at = ${trialExpiresAt}
      WHERE id = ${userId}
    `;
  }

  if (trialExpiresAt > now) {
    const daysLeft = Math.ceil((trialExpiresAt - now) / (24 * 60 * 60 * 1000));
    const hoursLeft = Math.ceil((trialExpiresAt - now) / (60 * 60 * 1000));
    return {
      state: "trial",
      daysLeft,
      hoursLeft,
      trialEndsAt: trialExpiresAt,
      subscriptionEndsAt: 0,
      plan: null,
    };
  }

  // التجربة انتهت ولا يوجد اشتراك
  return {
    state: "expired",
    daysLeft: 0,
    hoursLeft: 0,
    trialEndsAt: trialExpiresAt,
    subscriptionEndsAt: 0,
    plan: null,
  };
}

// ─── Orders ───────────────────────────────────────────────
function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `NJ-${ts}-${rand}`;
}

export async function createOrder(
  userId: string,
  username: string,
  plan: PlanKey
): Promise<Order> {
  await ensureSchema();
  const settings = await getSettings();
  const planConfig = PLAN_CONFIG[plan];
  if (!planConfig) throw new Error("Invalid plan");

  const amount = (settings as any)[planConfig.priceKey] as number;
  const id = `ord_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const orderNumber = generateOrderNumber();

  await sql`
    INSERT INTO orders (id, order_number, user_id, username, plan, amount, duration_days, status, payment_link)
    VALUES (${id}, ${orderNumber}, ${userId}, ${username}, ${plan}, ${amount}, ${planConfig.durationDays}, 'pending', ${settings.payment_link})
  `;

  const rows = await sql`SELECT * FROM orders WHERE id = ${id}`;
  return (rows as any[])[0] as Order;
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  await ensureSchema();
  return await sql`SELECT * FROM orders WHERE user_id = ${userId} ORDER BY created_at DESC` as any[];
}

export async function getAllOrders(filter?: "pending" | "confirmed" | "rejected" | "all"): Promise<Order[]> {
  await ensureSchema();
  if (filter && filter !== "all") {
    return await sql`SELECT * FROM orders WHERE status = ${filter} ORDER BY created_at DESC` as any[];
  }
  return await sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 200` as any[];
}

export async function confirmOrder(orderId: string, adminId: string): Promise<{ ok: boolean; message: string }> {
  await ensureSchema();
  const rows = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
  const order = (rows as any[])[0];
  if (!order) return { ok: false, message: "الطلب غير موجود" };
  if (order.status !== "pending") return { ok: false, message: "الطلب ليس معلّقاً" };

  // تفعيل الاشتراك
  const planConfig = PLAN_CONFIG[order.plan as PlanKey];
  if (!planConfig) return { ok: false, message: "الباقة غير صالحة" };

  // لو عنده اشتراك فعال، نضيف المدة عليه؛ لو لا، نبدأ من الآن
  const userRows = await sql`SELECT subscription_expires FROM users WHERE id = ${order.user_id}`;
  const user = (userRows as any[])[0];
  const currentExpires = Number(user?.subscription_expires || 0);
  const now = Date.now();
  const startFrom = currentExpires > now ? currentExpires : now;
  const newExpires = startFrom + planConfig.durationDays * 24 * 60 * 60 * 1000;

  await sql`
    UPDATE users
    SET subscription_plan = 'premium',
        subscription_expires = ${newExpires}
    WHERE id = ${order.user_id}
  `;
  await sql`
    UPDATE orders
    SET status = 'confirmed', confirmed_at = ${now}, confirmed_by = ${adminId}
    WHERE id = ${orderId}
  `;

  return { ok: true, message: `تم تفعيل اشتراك ${planConfig.name} حتى ${new Date(newExpires).toLocaleDateString("ar")}` };
}

export async function rejectOrder(orderId: string, adminId: string, reason: string): Promise<{ ok: boolean; message: string }> {
  await ensureSchema();
  const rows = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
  const order = (rows as any[])[0];
  if (!order) return { ok: false, message: "الطلب غير موجود" };
  if (order.status !== "pending") return { ok: false, message: "الطلب ليس معلّقاً" };

  await sql`
    UPDATE orders
    SET status = 'rejected', confirmed_at = ${Date.now()}, confirmed_by = ${adminId},
        rejection_reason = ${reason}
    WHERE id = ${orderId}
  `;
  return { ok: true, message: "تم رفض الطلب" };
}

// ─── Ban/Unban ────────────────────────────────────────────
export async function banUser(userId: string, reason: string): Promise<void> {
  await ensureSchema();
  await sql`UPDATE users SET banned = TRUE, banned_reason = ${reason} WHERE id = ${userId}`;
}

export async function unbanUser(userId: string): Promise<void> {
  await ensureSchema();
  await sql`UPDATE users SET banned = FALSE, banned_reason = NULL WHERE id = ${userId}`;
}

// ─── Admin: extend subscription manually ──────────────────
export async function extendSubscription(userId: string, days: number): Promise<{ ok: boolean; expires: number }> {
  await ensureSchema();
  const rows = await sql`SELECT subscription_expires FROM users WHERE id = ${userId}`;
  const u = (rows as any[])[0];
  if (!u) return { ok: false, expires: 0 };

  const current = Number(u.subscription_expires || 0);
  const now = Date.now();
  const startFrom = current > now ? current : now;
  const newExpires = startFrom + days * 24 * 60 * 60 * 1000;

  await sql`
    UPDATE users
    SET subscription_plan = 'premium', subscription_expires = ${newExpires}
    WHERE id = ${userId}
  `;
  return { ok: true, expires: newExpires };
}

// ─── Stats for Admin Dashboard ────────────────────────────
export async function getAdminStats(): Promise<{
  totalUsers: number;
  activeSubscriptions: number;
  trialUsers: number;
  expiredUsers: number;
  bannedUsers: number;
  pendingOrders: number;
  totalRevenue: number;
  confirmedOrders: number;
}> {
  await ensureSchema();
  const now = Date.now();

  const userStats = await sql`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE role = 'admin') AS admins,
      COUNT(*) FILTER (WHERE banned = TRUE) AS banned,
      COUNT(*) FILTER (WHERE subscription_expires > ${now}) AS active,
      COUNT(*) FILTER (WHERE subscription_expires < ${now} AND trial_expires_at > ${now}) AS trial,
      COUNT(*) FILTER (WHERE subscription_expires < ${now} AND (trial_expires_at < ${now} OR trial_expires_at = 0)) AS expired
    FROM users
  `;
  const u = (userStats as any[])[0] || {};

  const orderStats = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
      COALESCE(SUM(amount) FILTER (WHERE status = 'confirmed'), 0) AS revenue
    FROM orders
  `;
  const o = (orderStats as any[])[0] || {};

  return {
    totalUsers: Number(u.total || 0),
    activeSubscriptions: Number(u.active || 0),
    trialUsers: Number(u.trial || 0),
    expiredUsers: Number(u.expired || 0),
    bannedUsers: Number(u.banned || 0),
    pendingOrders: Number(o.pending || 0),
    confirmedOrders: Number(o.confirmed || 0),
    totalRevenue: Number(o.revenue || 0),
  };
}
