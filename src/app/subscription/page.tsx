"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SubscriptionPage() {
  const [data, setData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // أولاً نتحقق من حالة المستخدم
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.ok) { router.push("/login"); return; }
      if (d.user.role !== "admin" && (d.user.status === "pending" || d.user.status === "rejected")) {
        router.push("/pending"); return;
      }
      // ثم نحمّل بيانات الاشتراك
      Promise.all([
        fetch("/api/subscription").then(r => r.json()),
        fetch("/api/subscription/plans").then(r => r.json()),
      ]).then(([sub, plansData]) => {
        if (!sub.ok) { router.push("/login"); return; }
        setData(sub);
        setPlans(plansData.plans || []);
        setLoading(false);
      });
    });
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">⏳</div>;

  const usage = data?.usage || {};

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-amber-500 mb-2">💳 الاشتراك</h1>
        <p className="text-sm text-neutral-500">إدارة اشتراكك واستخدامك</p>
      </div>

      {/* Current plan */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{data?.plan_icon} {data?.plan_name}</h2>
            <p className="text-sm text-neutral-500">
              {data?.active ? `نشط حتى ${new Date(data.expires).toLocaleDateString("ar")}` : "غير نشط"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-amber-500">{data?.price}</p>
            <p className="text-xs text-neutral-500">ريال/شهر</p>
          </div>
        </div>

        {/* Usage bars */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          {(["scrape", "add", "message"] as const).map(op => {
            const u = usage[op] || {};
            const pct = u.limit ? (u.used / u.limit) * 100 : 0;
            return (
              <div key={op} className="bg-[#0a0a0a] rounded-lg p-3">
                <p className="text-xs text-neutral-500 mb-1">
                  {op === "scrape" ? "📥 سحب" : op === "add" ? "➕ إضافة" : "📨 رسائل"}
                </p>
                <p className="text-lg font-bold text-white">{u.used}/{u.limit}</p>
                <div className="mt-2 h-1.5 bg-[#262626] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${pct > 80 ? "bg-red-500" : pct > 50 ? "bg-yellow-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <p className="text-[10px] text-neutral-600 mt-1">متبقي: {u.remaining}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Features */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 mb-6">
        <h3 className="font-bold text-white mb-3">✨ مزايا خطتك</h3>
        <div className="grid grid-cols-2 gap-2">
          {data?.features?.map((f: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm text-neutral-300">
              <span className="text-amber-500">✓</span> {f}
            </div>
          ))}
        </div>
      </div>

      {/* Plans */}
      <h3 className="font-bold text-white mb-3">🔄 الخطط المتاحة</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {plans.map(p => (
          <div
            key={p.id}
            className={`bg-[#141414] border rounded-2xl p-5 ${
              p.is_current ? "border-amber-500/50" : "border-[#262626]"
            }`}
          >
            <div className="text-center mb-4">
              <div className="text-3xl mb-1">{p.icon}</div>
              <h3 className="font-bold text-white">{p.name}</h3>
              <p className="text-2xl font-black text-amber-500 mt-1">{p.price}</p>
              <p className="text-xs text-neutral-500">ريال/شهر</p>
            </div>
            <div className="space-y-1.5 mb-4">
              {p.features.map((f: string, i: number) => (
                <div key={i} className="text-xs text-neutral-400 flex items-center gap-1.5">
                  <span className="text-amber-500">✓</span> {f}
                </div>
              ))}
            </div>
            {p.is_current ? (
              <div className="text-center text-xs text-amber-500 font-bold py-2 border border-amber-500/20 rounded-lg">
                ✓ خطتك الحالية
              </div>
            ) : (
              <button className="w-full text-xs font-bold py-2 rounded-lg bg-[#262626] text-neutral-400 hover:bg-amber-500 hover:text-black transition-colors">
                طلب الترقية
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="text-center">
        <a href="/" className="text-sm text-neutral-500 hover:text-amber-500">← رجوع للرئيسية</a>
      </div>
    </div>
  );
}
