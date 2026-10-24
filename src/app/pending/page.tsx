"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChannelsFooter } from "../components/ChannelsFooter";

export default function PendingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.ok) { router.push("/login"); return; }
      setUser(d.user);
      // لو أدمن أو approved → ارجع للرئيسية
      if (d.user.role === "admin" || d.user.status === "approved") {
        router.push("/");
        return;
      }
      // لو rejected → اعرض صفحة الرفض
      setLoading(false);
    });
  }, []);

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" }).catch(() => {});
    document.cookie = "njadder_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  }

  async function checkAgain() {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    if (data.ok && (data.user.role === "admin" || data.user.status === "approved")) {
      router.push("/");
    } else if (data.ok && data.user.status === "rejected") {
      // أعد تحميل الصفحة لإظهار رسالة الرفض
      window.location.reload();
    } else {
      alert("⏳ لا يزال حسابك بانتظار الموافقة");
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">⏳</div>;

  const isRejected = user?.status === "rejected";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* أيقونة الحالة */}
        <div className="text-7xl mb-6">
          {isRejected ? "🚫" : "⏳"}
        </div>

        <h1 className={`text-3xl font-black mb-3 ${isRejected ? "text-red-500" : "text-amber-500"}`}>
          {isRejected ? "تم رفض حسابك" : "بانتظار الموافقة"}
        </h1>

        <p className="text-neutral-400 text-sm mb-2 leading-relaxed">
          {isRejected
            ? "عذراً، تم رفض حسابك من قبل المطور. إذا كنت تعتقد أن هذا خطأ، تواصل مع الإدارة."
            : (<span>تم إنشاء حسابك بنجاح يا <span className="text-amber-500 font-bold">{user?.username}</span></span>)
          }
        </p>

        {!isRejected && (
          <p className="text-neutral-500 text-xs mb-8 leading-relaxed">
            يجب على المطور مراجعة حسابك والموافقة عليه قبل أن تتمكن من استخدام الأداة.
            <br />
            عادة ما تستغرق الموافقة بضع دقائق إلى ساعات.
          </p>
        )}

        {isRejected && (
          <p className="text-neutral-500 text-xs mb-8 leading-relaxed">
            اسم المستخدم: <span className="text-red-400 font-mono">{user?.username}</span>
            <br />
            الحالة: <span className="text-red-400">مرفوض</span>
          </p>
        )}

        {/* أزرار */}
        <div className="space-y-3">
          {!isRejected && (
            <button
              onClick={checkAgain}
              className="w-full bg-amber-500 text-black font-bold rounded-lg py-3 text-base hover:bg-amber-400 transition-colors active:scale-95"
            >
              🔄 التحقق من الحالة
            </button>
          )}
          <button
            onClick={logout}
            className="w-full bg-[#141414] border border-[#262626] text-neutral-400 font-bold rounded-lg py-3 text-base hover:bg-[#1a1a1a] hover:text-white transition-colors active:scale-95"
          >
            🚪 تسجيل الخروج
          </button>
        </div>

        {/* معلومات إضافية */}
        <div className="mt-8 pt-6 border-t border-[#222]">
          <p className="text-[11px] text-neutral-600 leading-relaxed">
            {isRejected ? (
              <>للاستفسار تواصل مع المطور عبر القنوات الرسمية</>
            ) : (
              <>
                💡 سيبقى حسابك محفوظاً حتى يوافق المطور.
                <br />
                يمكنك إغلاق الصفحة والعودة لاحقاً للتحقق.
              </>
            )}
          </p>
        </div>

        <ChannelsFooter title="📡 للدعم والمتابعة" />
      </div>
    </div>
  );
}
