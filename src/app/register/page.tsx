"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChannelsFooter } from "../components/ChannelsFooter";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function register() {
    if (!username.trim()) {
      setError("أدخل اسم المستخدم");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (data.ok) {
        // Pending → /pending page
        // Admin (first user) → / directly
        if (data.needsApproval) router.push("/pending");
        else router.push("/");
      } else {
        setError(data.error || "فشل التسجيل");
      }
    } catch (e: any) {
      setError("خطأ في الاتصال: " + (e.message || "غير معروف"));
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-amber-500">NJADDER</h1>
          <p className="text-sm text-neutral-500 mt-1">PRO v7.0 — حساب جديد</p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">اسم المستخدم</label>
            <input
              className="w-full bg-[#0a0a0a] text-white text-base rounded-lg px-3 py-3 border border-[#333] focus:border-amber-500/50 focus:outline-none transition-colors"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              dir="ltr"
              autoFocus
              disabled={loading}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">كلمة المرور (6+ أحرف)</label>
            <input
              type="password"
              className="w-full bg-[#0a0a0a] text-white text-base rounded-lg px-3 py-3 border border-[#333] focus:border-amber-500/50 focus:outline-none transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && register()}
              dir="ltr"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 text-center">
              {error}
            </div>
          )}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300/80 leading-relaxed">
            ⚠️ ملاحظة: عند التسجيل، سيحتاج حسابك لموافقة المطور قبل أن تتمكن من استخدام الأداة.
          </div>
          <button
            onClick={register}
            disabled={loading}
            className="w-full bg-amber-500 text-black font-bold rounded-lg py-3 text-base hover:bg-amber-400 transition-colors disabled:opacity-50 active:scale-95 disabled:cursor-not-allowed"
          >
            {loading ? "⏳ جاري التسجيل..." : "📝 تسجيل"}
          </button>
          <p className="text-center text-sm text-neutral-500">
            لديك حساب؟{" "}
            <a href="/login" className="text-amber-500 hover:underline">
              سجل دخول
            </a>
          </p>
        </div>
        <ChannelsFooter />
      </div>
    </div>
  );
}
