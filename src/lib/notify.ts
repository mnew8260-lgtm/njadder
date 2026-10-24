// ════════════════════════════════════════════════════════════
// NJADDER PRO v7.0 — Admin Notifications
// ════════════════════════════════════════════════════════════
// Sends notifications to the support channel when important events happen:
// - New user registered (pending approval)
// - User approved/rejected
// - User deleted
// Uses GramJS to send via the default Telegram API.
// ════════════════════════════════════════════════════════════

import { buildClient } from "./telegram";
import { SERVER_CONFIG } from "./config";

const SUPPORT_CHANNEL = "@NMDDER_SUPPORT";

// Session string for the admin notifier account (optional)
// If not set, notifications are skipped silently
const NOTIFIER_SESSION = process.env.NOTIFIER_SESSION || "";

/**
 * Send a notification to the support channel.
 * Fails silently (no throw) — notifications are best-effort.
 */
export async function notifyAdmin(message: string): Promise<void> {
  if (!NOTIFIER_SESSION) {
    // No notifier session configured — skip silently
    return;
  }

  try {
    const client = buildClient(NOTIFIER_SESSION);
    await client.connect();
    if (!(await client.isUserAuthorized())) {
      await client.disconnect();
      return;
    }
    try {
      await client.sendMessage(SUPPORT_CHANNEL, { message });
    } finally {
      await client.disconnect();
    }
  } catch (e) {
    // Silent fail — notifications should never break the main flow
    console.error("[notify] Failed to send notification:", e);
  }
}

/**
 * Format and send a "new user pending approval" notification.
 */
export async function notifyNewUserPending(username: string, userId: string): Promise<void> {
  const msg = [
    "🔔 مستخدم جديد بانتظار الموافقة",
    "━━━━━━━━━━━━━━━━━━",
    `👤 الاسم: ${username}`,
    `🆔 ID: ${userId}`,
    `⏰ الوقت: ${new Date().toLocaleString("ar-SA")}`,
    "",
    "للموافقة: ادخل لوحة الأدمن ← تبويب 'بانتظار'",
    "https://njadder-app.tech/admin",
  ].join("\n");
  await notifyAdmin(msg);
}

/**
 * Format and send a "user approved" notification.
 */
export async function notifyUserApproved(username: string, adminUsername: string): Promise<void> {
  const msg = [
    "✅ تمت الموافقة على مستخدم",
    "━━━━━━━━━━━━━━━━━━",
    `👤 المستخدم: ${username}`,
    `👮 بواسطة: ${adminUsername}`,
    `⏰ الوقت: ${new Date().toLocaleString("ar-SA")}`,
  ].join("\n");
  await notifyAdmin(msg);
}

/**
 * Format and send a "user rejected" notification.
 */
export async function notifyUserRejected(username: string, adminUsername: string): Promise<void> {
  const msg = [
    "🚫 تم رفض مستخدم",
    "━━━━━━━━━━━━━━━━━━",
    `👤 المستخدم: ${username}`,
    `👮 بواسطة: ${adminUsername}`,
    `⏰ الوقت: ${new Date().toLocaleString("ar-SA")}`,
  ].join("\n");
  await notifyAdmin(msg);
}
