"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChannelsFooter } from "../components/ChannelsFooter";

type PlanKey = "1m" | "3m" | "1y";

export default function SubscribePage() {
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.ok) { router.push("/login"); return; }
      setUser(d.user);
      setSubscription({
        state: d.user.subscriptionState,
        daysLeft: d.user.daysLeft,
        hoursLeft: d.user.hoursLeft,
        trialEndsAt: d.user.trialEndsAt,
        subscriptionEndsAt: d.user.subscriptionEndsAt,
        plan: d.user.plan,
        bannedReason: d.user.bannedReason,
      });
      // لو حالته active أو trial → يمكنه الدخول للأداة
      if (d.user.subscriptionState === "active" || d.user.subscriptionState === "trial") {
        // نسمح بالبقاء في الصفحة (يمكنه الترقية)
      }
      loadOrders();
      setLoading(false);
    });
  }, []);

  async function loadOrders() {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.ok) {
        setOrders(data.orders || []);
        setSettings(data.settings);
      }
    } catch {}
  }

  async function createOrder(plan: PlanKey) {
    setBusy(true); setError(""); setInfo("⏳ جاري إنشاء الطلب...");
    setSelectedPlan(plan);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.ok) {
        setCreatedOrder(data.order);
        setInfo(`✅ تم إنشاء الطلب ${data.order.order_number}`);
        loadOrders();
      } else if (data.pendingOrder) {
        setCreatedOrder(data.pendingOrder);
        setInfo(`⚠️ لديك طلب معلّق بالفعل: ${data.pendingOrder.order_number}`);
      } else {
        setError(data.error || "فشل");
        setInfo("");
      }
    } catch (e: any) { setError(e.message); setInfo(""); }
    setBusy(false);
  }

  function copyOrderNumber() {
    if (!createdOrder) return;
    navigator.clipboard.writeText(createdOrder.order_number);
    setInfo("📋 تم نسخ رقم الطلب");
  }

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" }).catch(() => {});
    document.cookie = "njadder_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">⏳</div>;

  const isBanned = subscription?.state === "banned";
  const isExpired = subscription?.state === "expired";
  const isTrial = subscription?.state === "trial";
  const isActive = subscription?.state === "active";

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-3xl mx-auto pt-20 md:pt-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-black text-amber-500 mb-1">
          {isBanned ? "🚫 حساب محظور" : isExpired ? "🔒 انتهت التجربة" : isTrial ? "🎁 فترة تجريبية" : "👑 اشتراك مفعّل"}
        </h1>
        <p className="text-sm text-neutral-500">
          {isBanned ? subscription?.bannedReason || "تم حظر حسابك"
           : isExpired ? "للاستمرار في استخدام الأداة، اشترك الآن"
           : isTrial ? `متبقي ${subscription?.daysLeft} يوم و ${subscription?.hoursLeft} ساعة`
           : `متبقي ${subscription?.daysLeft} يوم على انتهاء اشتراكك`}
        </p>
      </div>

      {info && <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg p-3 mb-4 whitespace-pre-wrap break-all">{info}</div>}
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 mb-4 whitespace-pre-wrap break-all">{error}</div>}

      {/* Trial countdown */}
      {isTrial && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-6 text-center">
          <p className="text-xs text-amber-400 mb-2">⏰ الفترة التجريبية</p>
          <div className="flex justify-center gap-4 my-3">
            <div>
              <p className="text-3xl font-black text-amber-500">{subscription?.daysLeft}</p>
              <p className="text-[10px] text-neutral-500">يوم</p>
            </div>
            <div>
              <p className="text-3xl font-black text-amber-500">{subscription?.hoursLeft % 24}</p>
              <p className="text-[10px] text-neutral-500">ساعة</p>
            </div>
          </div>
          <p className="text-xs text-neutral-400">اشترك الآن لتفادي انقطاع الخدمة</p>
        </div>
      )}

      {/* Active subscription */}
      {isActive && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 mb-6 text-center">
          <p className="text-4xl mb-2">👑</p>
          <p className="text-lg font-bold text-green-400 mb-1">اشتراكك مفعّل!</p>
          <p className="text-xs text-neutral-400">ينتهي في: {new Date(subscription?.subscriptionEndsAt).toLocaleDateString("ar")}</p>
          <button onClick={() => router.push("/")} className="mt-4 bg-green-500 text-black font-bold rounded-lg py-2.5 px-6 text-sm hover:bg-green-400">
            ← العودة للأداة
          </button>
        </div>
      )}

      {/* Plans (only show if not active or expired or trial) */}
      {!isActive && !isBanned && (
        <>
          {isExpired && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-6 text-center">
              <p className="text-4xl mb-2">🔒</p>
              <p className="text-lg font-bold text-red-400 mb-1">انتهت الفترة التجريبية</p>
              <p className="text-xs text-neutral-400">للاستمرار في استخدام الأداة، اختر إحدى الباقات بالأسفل</p>
            </div>
          )}

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {([
              { key: "1m", name: "شهر واحد", icon: "📅", price: settings?.price_1m || 100, days: 30, popular: false },
              { key: "3m", name: "3 أشهر", icon: "🗓️", price: settings?.price_3m || 200, days: 90, popular: true, save: "وفّر 33%" },
              { key: "1y", name: "سنة كاملة", icon: "👑", price: settings?.price_1y || 500, days: 365, popular: false, save: "وفّر 58%" },
            ] as any[]).map(plan => (
              <div key={plan.key}
                className={`relative bg-[#141414] border rounded-2xl p-5 transition-all ${
                  plan.popular ? "border-amber-500 shadow-lg shadow-amber-500/10" : "border-[#262626]"
                }`}>
                {plan.popular && (
                  <div className="absolute -top-2 right-1/2 translate-x-1/2 bg-amber-500 text-black text-[10px] font-bold px-3 py-0.5 rounded-full">
                    الأكثر شيوعاً
                  </div>
                )}
                <div className="text-center">
                  <p className="text-3xl mb-2">{plan.icon}</p>
                  <p className="text-sm font-bold text-white mb-1">{plan.name}</p>
                  <p className="text-[10px] text-neutral-500 mb-3">{plan.days} يوم</p>
                  <p className="text-2xl font-black text-amber-500">
                    ${plan.price}
                    <span className="text-xs text-neutral-500 font-normal"> {settings?.currency || "USD"}</span>
                  </p>
                  {plan.save && (
                    <p className="text-[10px] text-green-400 mt-1">{plan.save}</p>
                  )}
                  <button
                    onClick={() => createOrder(plan.key)}
                    disabled={busy}
                    className={`w-full mt-4 font-bold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50 ${
                      plan.popular
                        ? "bg-amber-500 text-black hover:bg-amber-400"
                        : "bg-[#0a0a0a] text-amber-400 hover:bg-[#1a1a1a] border border-amber-500/30"
                    }`}>
                    {busy && selectedPlan === plan.key ? "⏳..." : "اشترك الآن"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Created order payment instructions */}
          {createdOrder && (
            <div className="bg-[#141414] border border-amber-500/30 rounded-2xl p-5 mb-6">
              <h3 className="font-bold text-amber-500 mb-3 text-center">📋 تعليمات الدفع</h3>
              <div className="space-y-3 text-sm">
                <div className="bg-[#0a0a0a] rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">رقم الطلب (أدخله في ملاحظات الدفع)</p>
                    <p className="text-amber-500 font-mono font-bold" dir="ltr">{createdOrder.order_number}</p>
                  </div>
                  <button onClick={copyOrderNumber} className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg">
                    📋 نسخ
                  </button>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-3">
                  <p className="text-xs text-neutral-500 mb-1">المبلغ المطلوب</p>
                  <p className="text-white font-bold">${createdOrder.amount} {settings?.currency || "USD"}</p>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-3">
                  <p className="text-xs text-neutral-500 mb-1">رابط الدفع</p>
                  <a href={createdOrder.payment_link} target="_blank" rel="noopener noreferrer"
                    className="text-amber-500 hover:underline break-all" dir="ltr">{createdOrder.payment_link}</a>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300/80 leading-relaxed">
                  <p className="font-bold mb-1">⚙️ خطوات الدفع:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>اضغط رابط الدفع بالأعلى</li>
                    <li>ادفع المبلغ المطلوب (${createdOrder.amount})</li>
                    <li>أدخل رقم الطلب <strong dir="ltr">{createdOrder.order_number}</strong> في ملاحظات الدفع</li>
                    <li>انتظر تأكيد الإدارة (خلال ساعات قليلة)</li>
                    <li>سيتم تفعيل اشتراكك فور تأكيد الدفع</li>
                  </ol>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300/80">
                  ℹ️ حالة الطلب: <strong>معلّق — بانتظار تأكيد الدفع</strong>
                  <br />يمكنك متابعة حالة طلبك من هذه الصفحة في أي وقت
                </div>
              </div>
            </div>
          )}

          {/* User's orders history */}
          {orders.length > 0 && (
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 mb-6">
              <h3 className="font-bold text-white mb-3 text-sm">📋 طلباتي السابقة ({orders.length})</h3>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {orders.map((o: any) => (
                  <div key={o.id} className="bg-[#0a0a0a] rounded-lg p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-amber-500" dir="ltr">{o.order_number}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        o.status === "confirmed" ? "bg-green-500/10 text-green-400"
                        : o.status === "rejected" ? "bg-red-500/10 text-red-400"
                        : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {o.status === "confirmed" ? "✓ مفعّل" : o.status === "rejected" ? "✗ مرفوض" : "⏳ معلّق"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-500">
                      <span>${o.amount} — {o.plan === "1m" ? "شهر" : o.plan === "3m" ? "3 أشهر" : "سنة"}</span>
                      <span>{new Date(Number(o.created_at)).toLocaleDateString("ar")}</span>
                    </div>
                    {o.status === "rejected" && o.rejection_reason && (
                      <p className="text-red-400 mt-1">السبب: {o.rejection_reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Banned user */}
      {isBanned && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-6 text-center">
          <p className="text-4xl mb-3">🚫</p>
          <p className="text-lg font-bold text-red-400 mb-2">تم حظر حسابك</p>
          <p className="text-sm text-neutral-400 mb-4">{subscription?.bannedReason || "اتصل بالدعم"}</p>
          <button onClick={logout} className="bg-[#141414] text-neutral-400 font-bold rounded-lg py-2.5 px-6 text-sm">
            🚪 تسجيل الخروج
          </button>
        </div>
      )}

      {/* Logout */}
      {!isBanned && (
        <div className="text-center mt-6">
          <button onClick={logout} className="text-sm text-neutral-500 hover:text-red-400">
            🚪 تسجيل الخروج
          </button>
        </div>
      )}

      <ChannelsFooter title="📡 للدعم والاستفسار" />
    </div>
  );
}
