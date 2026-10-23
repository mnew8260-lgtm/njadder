"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const PLANS: Record<string, { name: string; duration: number }> = {
  free: { name: "مجاني", duration: 0 },
  pro: { name: "احترافي", duration: 30 },
  premium: { name: "بريميوم", duration: 30 },
};

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
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
    if (data.ok) setUsers(data.users);
  }

  async function setPlan(userId: string, plan: string, days: number) {
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan, days }),
      });
      const data = await res.json();
      setMessage(data.message || data.error);
      if (data.ok) loadUsers();
    } catch (e: any) { setMessage(e.message); }
    setBusy(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">⏳</div>;

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-amber-500 mb-2">⚙️ لوحة الأدمن</h1>
        <p className="text-sm text-neutral-500">إدارة المستخدمين والاشتراكات</p>
      </div>

      {message && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm rounded-lg p-3 mb-4 text-center">
          {message}
        </div>
      )}

      {/* Users table */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#262626] text-xs text-neutral-500">
              <th className="text-right p-3">المستخدم</th>
              <th className="text-right p-3">الدور</th>
              <th className="text-right p-3">الخطة</th>
              <th className="text-right p-3">الحالة</th>
              <th className="text-right p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const expires = Number(u.subscription_expires || 0);
              const active = expires > Date.now();
              return (
                <tr key={u.id} className="border-b border-[#1a1a1a] text-sm">
                  <td className="p-3 text-white">{u.username}</td>
                  <td className="p-3">
                    {u.role === "admin" ? <span className="text-amber-500">👑 أدمن</span> : <span className="text-neutral-400">👤 مستخدم</span>}
                  </td>
                  <td className="p-3 text-neutral-400">{u.subscription_plan || "free"}</td>
                  <td className="p-3">
                    {active ? <span className="text-green-400 text-xs">نشط</span> : <span className="text-neutral-600 text-xs">غير نشط</span>}
                  </td>
                  <td className="p-3">
                    <select
                      onChange={e => setPlan(u.id, e.target.value, PLANS[e.target.value]?.duration || 30)}
                      disabled={busy}
                      className="bg-[#0a0a0a] text-white text-xs rounded px-2 py-1 border border-[#333]"
                      defaultValue={u.subscription_plan || "free"}
                    >
                      <option value="free">🆓 مجاني</option>
                      <option value="pro">⚡ احترافي (50)</option>
                      <option value="premium">👑 بريميوم (100)</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-center mt-6">
        <a href="/" className="text-sm text-neutral-500 hover:text-amber-500">← الرئيسية</a>
        <span className="mx-2 text-neutral-700">|</span>
        <a href="/subscription" className="text-sm text-neutral-500 hover:text-amber-500">💳 اشتراكي</a>
      </div>
    </div>
  );
}
