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
      if (data.ok) router.push("/");
      else setError(data.error || "فشل");
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-amber-500">NJADDER</h1>
          <p className="text-sm text-neutral-500 mt-1">PRO v7.0 — تسجيل الدخول</p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">اسم المستخدم</label>
            <input
              className="w-full bg-[#0a0a0a] text-white rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              dir="ltr"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">كلمة المرور</label>
            <input
              type="password"
              className="w-full bg-[#0a0a0a] text-white rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              dir="ltr"
            />
          </div>
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-amber-500 text-black font-bold rounded-lg py-2.5 hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {loading ? "⏳" : "🔐 دخول"}
          </button>
          <p className="text-center text-sm text-neutral-500">
            ليس لديك حساب؟{" "}
            <a href="/register" className="text-amber-500 hover:underline">سجل الآن</a>
          </p>
        </div>
      </div>
    </div>
  );
}
