"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type AdminTab = "overview" | "users" | "orders" | "settings";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // بيانات الأقسام
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [orderFilter, setOrderFilter] = useState<"pending" | "confirmed" | "rejected" | "all">("pending");

  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.ok) { router.push("/login"); return; }
      if (d.user.role !== "admin") { router.push("/"); return; }
      setUser(d.user);
      setLoading(false);
      loadAll();
    });
  }, []);

  async function loadAll() {
    await Promise.all([loadUsers(), loadOrders(), loadSettings()]);
  }

  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.ok) setUsers(data.users || []);
    } catch {}
  }

  async function loadOrders() {
    try {
      const res = await fetch(`/api/admin/orders?filter=${orderFilter}`);
      const data = await res.json();
      if (data.ok) {
        setOrders(data.orders || []);
        setStats(data.stats);
      }
    } catch {}
  }

  async function loadSettings() {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.ok) setSettings(data.settings);
    } catch {}
  }

  useEffect(() => { loadOrders(); }, [orderFilter]);

  async function adminAction(userId: string, action: "approve" | "reject" | "pending" | "delete") {
    if (action === "delete") {
      if (!confirm("⚠️ حذف نهائي للمستخدم وكل بياناته؟")) return;
    }
    setBusyId(userId); setMessage("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId }),
      });
      const data = await res.json();
      setMessage(data.message || data.error);
      if (data.ok) loadAll();
    } catch (e: any) { setMessage(e.message); }
    setBusyId(null);
  }

  async function orderAction(orderId: string, action: "confirm" | "reject") {
    const reason = action === "reject" ? prompt("سبب الرفض؟") : null;
    setBusyId(orderId); setMessage("");
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, orderId, reason }),
      });
      const data = await res.json();
      setMessage(data.message || data.error);
      if (data.ok) loadAll();
    } catch (e: any) { setMessage(e.message); }
    setBusyId(null);
  }

  async function banAction(userId: string, action: "ban" | "unban" | "extend") {
    let body: any = { action, userId };
    if (action === "ban") {
      body.reason = prompt("سبب الحظر؟") || "مخالفة";
    } else if (action === "extend") {
      const days = prompt("كم يوم تريد التمديد؟");
      if (!days) return;
      body.days = Number(days);
    }
    setBusyId(userId); setMessage("");
    try {
      const res = await fetch("/api/admin/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setMessage(data.message || data.error);
      if (data.ok) loadAll();
    } catch (e: any) { setMessage(e.message); }
    setBusyId(null);
  }

  async function saveSettings() {
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      setMessage(data.message || data.error);
      if (data.ok) setSettings(data.settings);
    } catch (e: any) { setMessage(e.message); }
    setBusy(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">⏳</div>;

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto pt-20 md:pt-6 pb-24 md:pb-6">
      <div className="text-center mb-5">
        <h1 className="text-2xl font-black text-amber-500 mb-1">👑 لوحة المالك — SaaS</h1>
        <p className="text-xs text-neutral-500">إدارة كاملة للنظام التجاري</p>
      </div>

      {message && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm rounded-lg p-3 mb-4 text-center">
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 mb-5 p-1 bg-[#0a0a0a] rounded-xl border border-[#222]">
        <button onClick={() => setTab("overview")} className={`py-2 text-xs font-bold rounded-lg ${tab === "overview" ? "bg-amber-500 text-black" : "text-neutral-400"}`}>📊 إحصائيات</button>
        <button onClick={() => setTab("users")} className={`py-2 text-xs font-bold rounded-lg ${tab === "users" ? "bg-amber-500 text-black" : "text-neutral-400"}`}>👥 مستخدمون</button>
        <button onClick={() => setTab("orders")} className={`py-2 text-xs font-bold rounded-lg ${tab === "orders" ? "bg-amber-500 text-black" : "text-neutral-400"}`}>💰 طلبات {stats?.pendingOrders ? `(${stats.pendingOrders})` : ""}</button>
        <button onClick={() => setTab("settings")} className={`py-2 text-xs font-bold rounded-lg ${tab === "settings" ? "bg-amber-500 text-black" : "text-neutral-400"}`}>⚙️ إعدادات</button>
      </div>

      {/* ─── Overview Tab ─── */}
      {tab === "overview" && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-white">{stats.totalUsers}</p>
              <p className="text-[11px] text-neutral-500 mt-1">إجمالي المستخدمين</p>
            </div>
            <div className="bg-[#141414] border border-green-500/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-green-400">{stats.activeSubscriptions}</p>
              <p className="text-[11px] text-neutral-500 mt-1">اشتراكات نشطة</p>
            </div>
            <div className="bg-[#141414] border border-amber-500/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-amber-400">{stats.trialUsers}</p>
              <p className="text-[11px] text-neutral-500 mt-1">في فترة تجريبية</p>
            </div>
            <div className="bg-[#141414] border border-red-500/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-red-400">{stats.expiredUsers}</p>
              <p className="text-[11px] text-neutral-500 mt-1">منتهية اشتراكهم</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#141414] border border-amber-500/30 rounded-xl p-4 text-center">
              <p className="text-xs text-neutral-500 mb-1">⏳ طلبات معلّقة</p>
              <p className="text-3xl font-black text-amber-500">{stats.pendingOrders}</p>
              <button onClick={() => setTab("orders")} className="mt-2 text-xs text-amber-500 hover:underline">معالجة ←</button>
            </div>
            <div className="bg-[#141414] border border-green-500/30 rounded-xl p-4 text-center">
              <p className="text-xs text-neutral-500 mb-1">✅ طلبات مكتملة</p>
              <p className="text-3xl font-black text-green-400">{stats.confirmedOrders}</p>
            </div>
            <div className="bg-[#141414] border border-blue-500/30 rounded-xl p-4 text-center">
              <p className="text-xs text-neutral-500 mb-1">💵 إجمالي الإيرادات</p>
              <p className="text-3xl font-black text-blue-400">${stats.totalRevenue}</p>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
            <h3 className="font-bold text-white mb-2 text-sm">🚫 محظورين: {stats.bannedUsers}</h3>
            <button onClick={() => setTab("users")} className="text-xs text-red-400 hover:underline">إدارة المحظورين ←</button>
          </div>
        </div>
      )}

      {/* ─── Users Tab ─── */}
      {tab === "users" && (
        <div className="space-y-2">
          {users.length === 0 ? (
            <div className="text-center py-10 text-neutral-600 text-sm">لا يوجد مستخدمون</div>
          ) : (
            users.map(u => {
              const subExpires = Number(u.subscription_expires || 0);
              const active = subExpires > Date.now();
              const isBanned = u.banned;
              return (
                <div key={u.id} className="bg-[#141414] border border-[#262626] rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-bold text-sm">{u.username}</span>
                        {u.role === "admin" && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">👑 أدمن</span>}
                        {isBanned && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">🚫 محظور</span>}
                        {active && !isBanned && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">💎 نشط</span>}
                        {!active && !isBanned && u.role !== "admin" && <span className="text-[10px] bg-neutral-500/20 text-neutral-400 px-2 py-0.5 rounded-full">⏰ منتهي</span>}
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-1">{new Date(Number(u.created_at)).toLocaleDateString("ar")} · {u.id.substring(0, 18)}…</p>
                      {isBanned && u.banned_reason && <p className="text-[11px] text-red-400 mt-1">السبب: {u.banned_reason}</p>}
                    </div>
                  </div>

                  {u.role !== "admin" && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {u.status === "pending" && (
                        <button onClick={() => adminAction(u.id, "approve")} disabled={busyId === u.id}
                          className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg font-bold">
                          ✓ موافقة
                        </button>
                      )}
                      {u.status === "approved" && !isBanned && (
                        <button onClick={() => adminAction(u.id, "reject")} disabled={busyId === u.id}
                          className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg font-bold">
                          🚫 رفض
                        </button>
                      )}
                      {isBanned ? (
                        <button onClick={() => banAction(u.id, "unban")} disabled={busyId === u.id}
                          className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg font-bold">
                          ✓ رفع الحظر
                        </button>
                      ) : (
                        <button onClick={() => banAction(u.id, "ban")} disabled={busyId === u.id}
                          className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg font-bold">
                          🚫 حظر
                        </button>
                      )}
                      <button onClick={() => banAction(u.id, "extend")} disabled={busyId === u.id}
                        className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg font-bold">
                        ➕ تمديد
                      </button>
                      <button onClick={() => adminAction(u.id, "delete")} disabled={busyId === u.id}
                        className="text-xs bg-neutral-500/10 hover:bg-neutral-500/20 text-neutral-400 px-3 py-1.5 rounded-lg font-bold">
                        🗑 حذف
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Orders Tab ─── */}
      {tab === "orders" && (
        <div className="space-y-3">
          {/* Order filter */}
          <div className="grid grid-cols-4 gap-1 mb-3 p-1 bg-[#0a0a0a] rounded-xl border border-[#222]">
            <button onClick={() => setOrderFilter("pending")} className={`py-1.5 text-xs font-bold rounded-lg ${orderFilter === "pending" ? "bg-amber-500 text-black" : "text-neutral-400"}`}>⏳ معلّق</button>
            <button onClick={() => setOrderFilter("confirmed")} className={`py-1.5 text-xs font-bold rounded-lg ${orderFilter === "confirmed" ? "bg-green-500 text-black" : "text-neutral-400"}`}>✓ مفعّل</button>
            <button onClick={() => setOrderFilter("rejected")} className={`py-1.5 text-xs font-bold rounded-lg ${orderFilter === "rejected" ? "bg-red-500 text-black" : "text-neutral-400"}`}>✗ مرفوض</button>
            <button onClick={() => setOrderFilter("all")} className={`py-1.5 text-xs font-bold rounded-lg ${orderFilter === "all" ? "bg-white text-black" : "text-neutral-400"}`}>📋 الكل</button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-10 text-neutral-600 text-sm">لا توجد طلبات</div>
          ) : (
            orders.map(o => (
              <div key={o.id} className="bg-[#141414] border border-[#262626] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-amber-500 font-mono font-bold text-sm" dir="ltr">{o.order_number}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        o.status === "confirmed" ? "bg-green-500/20 text-green-400"
                        : o.status === "rejected" ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {o.status === "confirmed" ? "✓ مفعّل" : o.status === "rejected" ? "✗ مرفوض" : "⏳ معلّق"}
                      </span>
                    </div>
                    <p className="text-xs text-white mt-1">👤 {o.username}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      💰 ${o.amount} · 📅 {o.plan === "1m" ? "شهر" : o.plan === "3m" ? "3 أشهر" : "سنة"}
                      · 📆 {new Date(Number(o.created_at)).toLocaleString("ar")}
                    </p>
                    {o.status === "rejected" && o.rejection_reason && (
                      <p className="text-xs text-red-400 mt-1">سبب الرفض: {o.rejection_reason}</p>
                    )}
                    {o.status === "confirmed" && (
                      <p className="text-xs text-green-400 mt-1">✓ أكّده: {o.confirmed_by} في {new Date(Number(o.confirmed_at)).toLocaleDateString("ar")}</p>
                    )}
                  </div>
                </div>

                {o.status === "pending" && (
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => orderAction(o.id, "confirm")} disabled={busyId === o.id}
                      className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 px-4 py-2 rounded-lg font-bold">
                      ✓ تأكيد الدفع وتفعيل الاشتراك
                    </button>
                    <button onClick={() => orderAction(o.id, "reject")} disabled={busyId === o.id}
                      className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg font-bold">
                      ✗ رفض
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Settings Tab ─── */}
      {tab === "settings" && settings && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-amber-500 text-sm">⚙️ إعدادات النظام التجاري</h3>

          {/* Payment link */}
          <div>
            <label className="block text-sm text-neutral-400 mb-1">🔗 رابط الدفع (محفظة إلكترونية)</label>
            <input type="text" dir="ltr"
              className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none"
              value={settings.payment_link}
              onChange={e => setSettings({ ...settings, payment_link: e.target.value })}
              placeholder="https://t.me/your_payment_username"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm text-neutral-400 mb-1">💵 العملة</label>
            <input type="text"
              className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none"
              value={settings.currency}
              onChange={e => setSettings({ ...settings, currency: e.target.value })}
              placeholder="USD"
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">📅 شهر ($)</label>
              <input type="number"
                className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none"
                value={settings.price_1m}
                onChange={e => setSettings({ ...settings, price_1m: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">🗓️ 3 أشهر ($)</label>
              <input type="number"
                className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none"
                value={settings.price_3m}
                onChange={e => setSettings({ ...settings, price_3m: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">👑 سنة ($)</label>
              <input type="number"
                className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none"
                value={settings.price_1y}
                onChange={e => setSettings({ ...settings, price_1y: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Trial days */}
          <div>
            <label className="block text-sm text-neutral-400 mb-1">🎁 أيام الفترة التجريبية</label>
            <input type="number"
              className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none"
              value={settings.trial_days}
              onChange={e => setSettings({ ...settings, trial_days: Number(e.target.value) })}
            />
            <p className="text-[11px] text-neutral-500 mt-1">عدد الأيام التي يحصل عليها المستخدمون الجدد كتجربة مجانية</p>
          </div>

          <button onClick={saveSettings} disabled={busy}
            className="w-full bg-amber-500 text-black font-bold rounded-lg py-3 text-base hover:bg-amber-400 transition-colors disabled:opacity-50">
            {busy ? "⏳ جاري الحفظ..." : "💾 حفظ الإعدادات"}
          </button>
        </div>
      )}

      <div className="text-center mt-6">
        <a href="/" className="text-sm text-neutral-500 hover:text-amber-500">← الرئيسية</a>
      </div>
    </div>
  );
}
