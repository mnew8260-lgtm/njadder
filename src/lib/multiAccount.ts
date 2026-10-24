// ════════════════════════════════════════════════════════════
// NJADDER PRO v7.0 — Multi-Account Manager
// ════════════════════════════════════════════════════════════
// Manages multiple Telegram accounts with rotation:
// - Round-robin rotation for scrape operations
// - Auto-switch on Flood / errors for add operations
// - Per-account usage tracking
// - Auto-recovery (reconnect failed accounts)
// ════════════════════════════════════════════════════════════

import { TelegramClient } from "telegram";
import { buildClient } from "./telegram";

export interface ManagedAccount {
  id: string;
  phone: string;
  sessionString: string;
  apiId?: number;
  apiHash?: string;
  client?: TelegramClient;
  connected: boolean;
  authorized: boolean;
  // إحصائيات
  scrapeCount: number;
  addCount: number;
  errorCount: number;
  lastUsed: number;
  lastError?: string;
  // حالة Flood
  floodUntil?: number;
  fullName?: string;
  username?: string;
}

export class MultiAccountManager {
  private accounts: ManagedAccount[] = [];
  private currentIndex: number = 0;

  /**
   * تحميل الحسابات من قاعدة البيانات (تمريرها كمصفوفة)
   */
  loadAccounts(accounts: Array<{
    id: string;
    phone: string;
    session_string: string;
    api_id?: string;
    api_hash?: string;
    full_name?: string;
    username?: string;
  }>): void {
    this.accounts = accounts.map((a) => ({
      id: a.id,
      phone: a.phone,
      sessionString: a.session_string,
      apiId: a.api_id ? Number(a.api_id) : undefined,
      apiHash: a.api_hash || undefined,
      connected: false,
      authorized: false,
      scrapeCount: 0,
      addCount: 0,
      errorCount: 0,
      lastUsed: 0,
      fullName: a.full_name,
      username: a.username,
    }));
  }

  /**
   * الاتصال بكل الحسابات بشكل متوازي
   */
  async connectAll(): Promise<{ connected: number; failed: number; details: string[] }> {
    const details: string[] = [];
    let connected = 0;
    let failed = 0;

    // الاتصال بالتوازي (بحد 5 حسابات في نفس الوقت)
    const chunks: ManagedAccount[][] = [];
    for (let i = 0; i < this.accounts.length; i += 5) {
      chunks.push(this.accounts.slice(i, i + 5));
    }

    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map(async (acc) => this.connectOne(acc))
      );

      results.forEach((r, idx) => {
        const acc = chunk[idx];
        if (r.status === "fulfilled" && r.value) {
          connected++;
          details.push(`✓ ${acc.fullName || acc.phone}: متصل`);
        } else {
          failed++;
          const err = r.status === "rejected" ? r.reason?.message : "غير مصرّح";
          acc.lastError = err;
          details.push(`✗ ${acc.fullName || acc.phone}: ${err?.substring(0, 50)}`);
        }
      });
    }

    return { connected, failed, details };
  }

  /**
   * الاتصال بحساب واحد
   */
  private async connectOne(acc: ManagedAccount): Promise<boolean> {
    try {
      const client = buildClient(acc.sessionString, {
        apiId: acc.apiId,
        apiHash: acc.apiHash,
      });
      await client.connect();
      if (!(await client.isUserAuthorized())) {
        await client.disconnect();
        acc.connected = false;
        acc.authorized = false;
        acc.lastError = "غير مصرّح";
        return false;
      }
      acc.client = client;
      acc.connected = true;
      acc.authorized = true;
      return true;
    } catch (e: any) {
      acc.connected = false;
      acc.authorized = false;
      acc.lastError = e.message?.substring(0, 100);
      return false;
    }
  }

  /**
   * اختيار حساب متاح (غير في حالة flood، متصل)
   * @param preferredIndex مؤشر الحساب المُفضّل (لو null = round-robin)
   * @param excludeIds IDs للحسابات المستبعدة (مثلاً: حسابات Flood)
   */
  getAvailable(preferredIndex?: number, excludeIds: Set<string> = new Set()): ManagedAccount | null {
    if (this.accounts.length === 0) return null;

    const now = Date.now();
    // تصفية الحسابات المتاحة
    const available = this.accounts.filter(
      (a) =>
        a.connected &&
        a.authorized &&
        !excludeIds.has(a.id) &&
        (!a.floodUntil || a.floodUntil < now)
    );

    if (available.length === 0) return null;

    // لو فيه preferred index، نستخدمه
    if (preferredIndex !== undefined && preferredIndex >= 0) {
      // نحاول إيجاد الحساب المُحدد
      const target = this.accounts[preferredIndex];
      if (target && available.includes(target)) {
        target.lastUsed = now;
        return target;
      }
    }

    // round-robin على الحسابات المتاحة
    const acc = available[this.currentIndex % available.length];
    this.currentIndex = (this.currentIndex + 1) % available.length;
    acc.lastUsed = now;
    return acc;
  }

  /**
   * الحصول على حساب معين بـ ID (للاختيار اليدوي)
   */
  getById(id: string): ManagedAccount | null {
    return this.accounts.find((a) => a.id === id) || null;
  }

  /**
   * تحديد حساب في حالة Flood لمدة معينة
   */
  markFlood(accountId: string, seconds: number): void {
    const acc = this.accounts.find((a) => a.id === accountId);
    if (acc) {
      acc.floodUntil = Date.now() + seconds * 1000;
      acc.errorCount++;
      acc.lastError = `Flood ${seconds}s`;
    }
  }

  /**
   * تسجيل استخدام ناجح
   */
  recordSuccess(accountId: string, op: "scrape" | "add"): void {
    const acc = this.accounts.find((a) => a.id === accountId);
    if (acc) {
      if (op === "scrape") acc.scrapeCount++;
      else acc.addCount++;
      acc.lastUsed = Date.now();
      acc.lastError = undefined;
    }
  }

  /**
   * تسجيل خطأ
   */
  recordError(accountId: string, error: string): void {
    const acc = this.accounts.find((a) => a.id === accountId);
    if (acc) {
      acc.errorCount++;
      acc.lastError = error.substring(0, 100);
    }
  }

  /**
   * حالة كل الحسابات (للعرض)
   */
  getStatus(): Array<{
    id: string;
    phone: string;
    fullName?: string;
    username?: string;
    connected: boolean;
    authorized: boolean;
    scrapeCount: number;
    addCount: number;
    errorCount: number;
    inFlood: boolean;
    floodRemaining?: number;
    lastError?: string;
  }> {
    const now = Date.now();
    return this.accounts.map((a) => ({
      id: a.id,
      phone: a.phone,
      fullName: a.fullName,
      username: a.username,
      connected: a.connected,
      authorized: a.authorized,
      scrapeCount: a.scrapeCount,
      addCount: a.addCount,
      errorCount: a.errorCount,
      inFlood: !!(a.floodUntil && a.floodUntil > now),
      floodRemaining: a.floodUntil && a.floodUntil > now
        ? Math.ceil((a.floodUntil - now) / 1000)
        : undefined,
      lastError: a.lastError,
    }));
  }

  /**
   * عدد الحسابات المتاحة الآن
   */
  get availableCount(): number {
    const now = Date.now();
    return this.accounts.filter(
      (a) => a.connected && a.authorized && (!a.floodUntil || a.floodUntil < now)
    ).length;
  }

  get totalCount(): number {
    return this.accounts.length;
  }

  /**
   * قطع اتصال كل الحسابات
   */
  async disconnectAll(): Promise<void> {
    for (const acc of this.accounts) {
      try {
        if (acc.client) {
          await acc.client.disconnect();
        }
      } catch {}
    }
    this.accounts = [];
  }
}
