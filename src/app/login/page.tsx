"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function login() {
    if (!username || !password) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push("/");
      } else if (data.needsApproval || data.rejected) {
        // توجيه لصفحة /pending بدل عرض رسالة خطأ عادية
        router.push("/pending");
      } else {
        setError(data.error || "فشل");
      }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-amber-500">NJADDER</h1>
          <p className="text-sm text-neutral-500 mt-1">PRO v7.0 — تسجيل الدخول</p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">اسم المستخدم</label>
            <input
              className="w-full bg-[#0a0a0a] text-white text-base rounded-lg px-3 py-3 border border-[#333] focus:border-amber-500/50 focus:outline-none"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              dir="ltr"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">كلمة المرور</label>
            <input
              type="password"
              className="w-full bg-[#0a0a0a] text-white text-base rounded-lg px-3 py-3 border border-[#333] focus:border-amber-500/50 focus:outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              dir="ltr"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-amber-500 text-black font-bold rounded-lg py-3 text-base hover:bg-amber-400 transition-colors disabled:opacity-50 active:scale-95"
          >
            {loading ? "⏳" : "🔐 دخول"}
          </button>
          <p className="text-center text-sm text-neutral-500">
            ليس لديك حساب؟{" "}
            <a href="/register" className="text-amber-500 hover:underline">سجل الآن</a>
          </p>
        </div>

        {/* ─── Official Channels Footer ─── */}
        <div className="mt-6 bg-[#141414] border border-[#262626] rounded-2xl p-4 text-center">
          <p className="text-xs text-neutral-500 mb-3">📡 القنوات الرسمية والدعم</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <a href="https://t.me/njadder_pro" target="_blank" rel="noopener noreferrer"
               className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg font-bold transition-colors">
              ⭐ @njadder_pro
            </a>
            <a href="https://t.me/NMDDER_ch" target="_blank" rel="noopener noreferrer"
               className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg font-bold transition-colors">
              📢 @NMDDER_ch
            </a>
            <a href="https://t.me/NMDDER_SUPPORT" target="_blank" rel="noopener noreferrer"
               className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg font-bold transition-colors">
              💬 @NMDDER_SUPPORT
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
