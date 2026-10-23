"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const PLANS: Record<string, { name: string; duration: number }> = {
  free: { name: "مجاني", duration: 0 },
  pro: { name: "احترافي", duration: 30 },
  premium: { name: "بريميوم", duration: 30 },
};

type Tab = "pending" | "approved" | "rejected" | "all";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<Tab>("pending");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.ok) { router.push("/login"); return; }
      if (d.user.role !== "admin") { router.push("/"); return; }
      setUser(d.user);
      loadUsers();
      setLoading(false);
    });
  }, []);

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (data.ok) {
      setUsers(data.users);
      setStats(data.stats || {});
    }
  }

  async function adminAction(userId: string, action: "approve" | "reject" | "pending" | "delete") {
    if (action === "delete") {
      if (!confirm("⚠️ حذف نهائي للمستخدم وكل بياناته (حسابات تيليجرام + قائمة سوداء + سجلات)؟ لا يمكن التراجع.")) return;
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
      if (data.ok) loadUsers();
    } catch (e: any) { setMessage(e.message); }
    setBusyId(null);
  }

  async function setPlan(userId: string, plan: string, days: number) {
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_plan", userId, plan, days }),
      });
      const data = await res.json();
      setMessage(data.message || data.error);
      if (data.ok) loadUsers();
    } catch (e: any) { setMessage(e.message); }
    setBusy(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">⏳</div>;

  // فلترة حسب التبويب
  const filteredUsers = users.filter(u => {
    if (tab === "all") return true;
    if (tab === "approved") return u.status === "approved" || u.role === "admin";
    return u.status === tab;
  });

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto pt-20 md:pt-6 pb-24 md:pb-6">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0f0f0f] border-b border-[#262626] safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <a href="/" className="text-amber-500 text-sm">← رجوع</a>
          <h1 className="text-lg font-bold text-amber-500">⚙️ الأدمن</h1>
          <div className="w-12"></div>
        </div>
      </div>

      {/* Desktop header */}
      <div className="text-center mb-6 hidden md:block">
        <h1 className="text-3xl font-black text-amber-500 mb-1">⚙️ لوحة الأدمن</h1>
        <p className="text-sm text-neutral-500">إدارة المستخدمين والموافقات والاشتراكات</p>
      </div>

      {message && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm rounded-lg p-3 mb-4 text-center">
          {message}
        </div>
      )}

      {/* ─── إحصائيات سريعة ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-white">{stats.total}</p>
          <p className="text-[11px] text-neutral-500 mt-1">الإجمالي</p>
        </div>
        <button onClick={() => setTab("pending")} className={`bg-[#141414] border rounded-xl p-3 text-center transition-colors ${tab === "pending" ? "border-amber-500 bg-amber-500/5" : "border-[#262626]"}`}>
          <p className="text-2xl font-black text-amber-400">{stats.pending}</p>
          <p className="text-[11px] text-neutral-500 mt-1">⏳ بانتظار</p>
        </button>
        <button onClick={() => setTab("approved")} className={`bg-[#141414] border rounded-xl p-3 text-center transition-colors ${tab === "approved" ? "border-green-500 bg-green-500/5" : "border-[#262626]"}`}>
          <p className="text-2xl font-black text-green-400">{stats.approved}</p>
          <p className="text-[11px] text-neutral-500 mt-1">✓ مُوافَق</p>
        </button>
        <button onClick={() => setTab("rejected")} className={`bg-[#141414] border rounded-xl p-3 text-center transition-colors ${tab === "rejected" ? "border-red-500 bg-red-500/5" : "border-[#262626]"}`}>
          <p className="text-2xl font-black text-red-400">{stats.rejected}</p>
          <p className="text-[11px] text-neutral-500 mt-1">🚫 مرفوض</p>
        </button>
      </div>

      {/* ─── تبويبات ─── */}
      <div className="grid grid-cols-4 gap-1 mb-4 p-1 bg-[#0a0a0a] rounded-xl border border-[#222]">
        <button onClick={() => setTab("pending")} className={`py-2 text-xs font-bold rounded-lg ${tab === "pending" ? "bg-amber-500 text-black" : "text-neutral-400"}`}>⏳ بانتظار</button>
        <button onClick={() => setTab("approved")} className={`py-2 text-xs font-bold rounded-lg ${tab === "approved" ? "bg-green-500 text-black" : "text-neutral-400"}`}>✓ موافق</button>
        <button onClick={() => setTab("rejected")} className={`py-2 text-xs font-bold rounded-lg ${tab === "rejected" ? "bg-red-500 text-black" : "text-neutral-400"}`}>🚫 مرفوض</button>
        <button onClick={() => setTab("all")} className={`py-2 text-xs font-bold rounded-lg ${tab === "all" ? "bg-white text-black" : "text-neutral-400"}`}>📋 الكل</button>
      </div>

      {/* ─── قائمة المستخدمين ─── */}
      {filteredUsers.length === 0 ? (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-10 text-center text-neutral-600 text-sm">
          لا يوجد مستخدمون في هذه الفئة
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map(u => {
            const expires = Number(u.subscription_expires || 0);
            const active = expires > Date.now();
            const isAdmin = u.role === "admin";
            const status = isAdmin ? "approved" : (u.status || "pending");
            const isBusy = busyId === u.id;
            return (
              <div key={u.id} className="bg-[#141414] border border-[#262626] rounded-xl p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold text-sm">{u.username}</span>
                      {isAdmin && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">👑 أدمن</span>}
                      {!isAdmin && status === "pending" && <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">⏳ بانتظار</span>}
                      {!isAdmin && status === "approved" && <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">✓ مُوافَق</span>}
                      {!isAdmin && status === "rejected" && <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">🚫 مرفوض</span>}
                      {active && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">💎 {u.subscription_plan}</span>}
                    </div>
                    <p className="text-[11px] text-neutral-600 mt-1" dir="ltr">
                      {new Date(Number(u.created_at)).toLocaleString("ar")} · id: {u.id.substring(0, 18)}…
                    </p>
                  </div>
                </div>

                {/* ─── أزرار الإجراءات ─── */}
                {!isAdmin && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {status !== "approved" && (
                      <button
                        onClick={() => adminAction(u.id, "approve")}
                        disabled={isBusy}
                        className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 px-3 py-1.5 rounded-lg font-bold transition-colors disabled:opacity-50"
                      >
                        {isBusy ? "⏳" : "✓ موافقة"}
                      </button>
                    )}
                    {status !== "rejected" && (
                      <button
                        onClick={() => adminAction(u.id, "reject")}
                        disabled={isBusy}
                        className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg font-bold transition-colors disabled:opacity-50"
                      >
                        🚫 رفض
                      </button>
                    )}
                    {status === "rejected" && (
                      <button
                        onClick={() => adminAction(u.id, "pending")}
                        disabled={isBusy}
                        className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg font-bold transition-colors disabled:opacity-50"
                      >
                        ⏳ إعادة للانتظار
                      </button>
                    )}
                    <button
                      onClick={() => adminAction(u.id, "delete")}
                      disabled={isBusy}
                      className="text-xs bg-neutral-500/10 hover:bg-neutral-500/20 text-neutral-400 px-3 py-1.5 rounded-lg font-bold transition-colors disabled:opacity-50"
                    >
                      🗑 حذف
                    </button>
                    {/* تعيين خطة */}
                    <select
                      onChange={e => setPlan(u.id, e.target.value, PLANS[e.target.value]?.duration || 30)}
                      disabled={busy}
                      className="text-xs bg-[#0a0a0a] text-white rounded px-2 py-1.5 border border-[#333] mr-auto"
                      defaultValue={u.subscription_plan || "free"}
                    >
                      <option value="free">🆓 مجاني</option>
                      <option value="pro">⚡ احترافي (50)</option>
                      <option value="premium">👑 بريميوم (100)</option>
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center mt-6">
        <a href="/" className="text-sm text-neutral-500 hover:text-amber-500">← الرئيسية</a>
      </div>
    </div>
  );
}
