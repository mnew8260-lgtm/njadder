"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccountsPage() {
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Add account form
  const [phone, setPhone] = useState("");
  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [step, setStep] = useState<"phone" | "code" | "2fa">("phone");
  const [code, setCode] = useState("");
  const [password2fa, setPassword2fa] = useState("");
  const [sessionString, setSessionString] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");

  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.ok) { router.push("/login"); return; }
      setUser(d.user);
      setLoading(false);
      loadAccounts();
    });
  }, []);

  async function loadAccounts() {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.ok) setAccounts(data.accounts);
    } catch {}
  }

  // ─── Step 1: Send code ───
  async function sendCode() {
    if (!phone) { setError("أدخل رقم الهاتف"); return; }
    setBusy(true); setError(""); setInfo("⏳ جاري إرسال الكود...");
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_code",
          phone,
          apiId: apiId || undefined,
          apiHash: apiHash || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSessionString(data.sessionString);
        setPhoneCodeHash(data.phoneCodeHash);
        setStep("code");
        setInfo("✅ تم إرسال الكود إلى تيليجرام");
      } else {
        setError(data.error || "فشل الإرسال");
        setInfo("");
      }
    } catch (e: any) { setError(e.message); setInfo(""); }
    setBusy(false);
  }

  // ─── Step 2: Verify code ───
  async function verifyCode() {
    if (!code) { setError("أدخل الكود"); return; }
    setBusy(true); setError(""); setInfo("⏳ جاري التحقق...");
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_code",
          phone,
          code,
          sessionString,
          phoneCodeHash,
          apiId: apiId || undefined,
          apiHash: apiHash || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setInfo("✅ تم تسجيل الدخول بنجاح!");
        setPhone(""); setCode(""); setStep("phone");
        loadAccounts();
      } else if (data.need2FA) {
        setStep("2fa");
        setInfo("🔐 أدخل كلمة مرور 2FA");
      } else {
        setError(data.error || "فشل التحقق");
        setInfo("");
      }
    } catch (e: any) { setError(e.message); setInfo(""); }
    setBusy(false);
  }

  // ─── Step 3: Verify 2FA ───
  async function verify2FA() {
    if (!password2fa) { setError("أدخل كلمة المرور"); return; }
    setBusy(true); setError(""); setInfo("⏳ جاري التحقق...");
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_2fa",
          phone,
          password: password2fa,
          sessionString,
          apiId: apiId || undefined,
          apiHash: apiHash || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setInfo("✅ تم تسجيل الدخول بنجاح!");
        setPhone(""); setPassword2fa(""); setStep("phone");
        loadAccounts();
      } else {
        setError(data.error || "فشل");
        setInfo("");
      }
    } catch (e: any) { setError(e.message); setInfo(""); }
    setBusy(false);
  }

  // ─── Delete account ───
  async function deleteAccount(id: string) {
    if (!confirm("حذف هذا الحساب؟")) return;
    try {
      await fetch("/api/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      loadAccounts();
    } catch {}
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">⏳</div>;

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-black text-amber-500 mb-1">📱 الحسابات</h1>
        <p className="text-sm text-neutral-500">إدارة حسابات تيليجرام ({accounts.length})</p>
      </div>

      {/* Info / Error */}
      {info && <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg p-3 mb-4">{info}</div>}
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>}

      {/* Existing accounts */}
      {accounts.length > 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 mb-6">
          <h3 className="font-bold text-white mb-3">📋 حساباتك ({accounts.length})</h3>
          <div className="space-y-2">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center justify-between bg-[#0a0a0a] rounded-lg p-3">
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">{a.full_name || "بدون اسم"}</p>
                  <p className="text-xs text-neutral-500" dir="ltr">{a.phone}</p>
                  {a.username && <p className="text-xs text-amber-500">@{a.username}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.status === "active" ? "bg-green-500/10 text-green-400" : "bg-neutral-500/10 text-neutral-400"}`}>
                    {a.status === "active" ? "✓ نشط" : "⚠️ " + a.status}
                  </span>
                  <button
                    onClick={() => deleteAccount(a.id)}
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add account form */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6">
        <h3 className="font-bold text-white mb-4">➕ إضافة حساب جديد</h3>

        {step === "phone" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">📱 رقم الهاتف *</label>
              <input
                type="tel"
                className="w-full bg-[#0a0a0a] text-white rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none"
                placeholder="+9665XXXXXXXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                dir="ltr"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">API ID (اختياري)</label>
                <input
                  type="text"
                  className="w-full bg-[#0a0a0a] text-white rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none"
                  placeholder="افتراضي"
                  value={apiId}
                  onChange={e => setApiId(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">API Hash (اختياري)</label>
                <input
                  type="text"
                  className="w-full bg-[#0a0a0a] text-white rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none"
                  placeholder="افتراضي"
                  value={apiHash}
                  onChange={e => setApiHash(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
            <button
              onClick={sendCode}
              disabled={busy || !phone}
              className="w-full bg-amber-500 text-black font-bold rounded-lg py-2.5 hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {busy ? "⏳ جاري الإرسال..." : "📨 إرسال الكود"}
            </button>
          </div>
        )}

        {step === "code" && (
          <div className="space-y-4">
            <div className="text-center text-sm text-amber-400 mb-2">
              ✅ تم إرسال الكود إلى تيليجرام على الرقم {phone}
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">📩 الكود</label>
              <input
                type="text"
                className="w-full bg-[#0a0a0a] text-white text-center text-2xl tracking-widest font-mono rounded-lg px-3 py-3 border border-[#333] focus:border-amber-500/50 focus:outline-none"
                placeholder="12345"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                dir="ltr"
                autoFocus
                onKeyDown={e => e.key === "Enter" && verifyCode()}
              />
            </div>
            <button
              onClick={verifyCode}
              disabled={busy || !code}
              className="w-full bg-amber-500 text-black font-bold rounded-lg py-2.5 hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {busy ? "⏳ جاري التحقق..." : "✓ تحقق"}
            </button>
            <button
              onClick={() => { setStep("phone"); setCode(""); setError(""); setInfo(""); }}
              className="w-full text-sm text-neutral-500 hover:text-white"
            >
              ← رجوع
            </button>
          </div>
        )}

        {step === "2fa" && (
          <div className="space-y-4">
            <div className="text-center text-sm text-amber-400 mb-2">
              🔐 هذا الحساب مفعّل عليه التحقق بخطوتين (2FA)
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">🔑 كلمة مرور 2FA</label>
              <input
                type="password"
                className="w-full bg-[#0a0a0a] text-white rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none"
                placeholder="••••••••"
                value={password2fa}
                onChange={e => setPassword2fa(e.target.value)}
                dir="ltr"
                autoFocus
                onKeyDown={e => e.key === "Enter" && verify2FA()}
              />
            </div>
            <button
              onClick={verify2FA}
              disabled={busy || !password2fa}
              className="w-full bg-amber-500 text-black font-bold rounded-lg py-2.5 hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {busy ? "⏳ جاري التحقق..." : "✓ تحقق"}
            </button>
            <button
              onClick={() => { setStep("phone"); setPassword2fa(""); setError(""); setInfo(""); }}
              className="w-full text-sm text-neutral-500 hover:text-white"
            >
              ← رجوع
            </button>
          </div>
        )}
      </div>

      {/* How to use */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 mt-6">
        <h3 className="font-bold text-white mb-2 text-sm">💡 كيف تستخدم الأوامر؟</h3>
        <ol className="text-xs text-neutral-400 space-y-1 list-decimal list-inside">
          <li>أضف حساب تيليجرام من النموذج فوق</li>
          <li>ارجع للرئيسية ← اختر فئة (مثل: أدوات الاستخراج)</li>
          <li>اختر الأمر المطلوب (مثل: استخراج أعضاء عام)</li>
          <li>اختر الحساب ← املأ الحقول ← اضغط "⚡ تنفيذ الأمر"</li>
        </ol>
      </div>

      <div className="text-center mt-6">
        <a href="/" className="text-sm text-neutral-500 hover:text-amber-500">← الرئيسية</a>
      </div>
    </div>
  );
}
