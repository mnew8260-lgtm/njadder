"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Step = "phones" | "codes" | "done";

export default function MultiAccountsPage() {
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [step, setStep] = useState<Step>("phones");

  // إدخال الأرقام
  const [phonesText, setPhonesText] = useState("");

  // الأكواد (بعد send_code)
  const [codeResults, setCodeResults] = useState<any[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [passwords, setPasswords] = useState<Record<string, string>>({});

  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.ok) { router.push("/login"); return; }
      if (d.user.role !== "admin" && (d.user.status === "pending" || d.user.status === "rejected")) {
        router.push("/pending"); return;
      }
      setUser(d.user); setLoading(false); loadAccounts();
    });
  }, []);

  async function loadAccounts() {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.ok) setAccounts(data.accounts || []);
    } catch {}
  }

  // ─── رفع ملف أرقام ───
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setPhonesText(text);
    setInfo(`📄 تم تحميل ${f.name} (${text.split("\n").filter(l => l.trim()).length} سطر)`);
  }

  // ─── الخطوة 1: إرسال أكواد لكل الأرقام ───
  async function sendAllCodes() {
    const phones = phonesText.split("\n").map(p => p.trim()).filter(Boolean);
    if (!phones.length) { setError("أدخل رقم واحد على الأقل"); return; }
    setBusy(true); setError(""); setInfo(`⏳ جاري إرسال الأكواد لـ ${phones.length} رقم...`);
    try {
      const res = await fetch("/api/accounts/multi", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk_send_code", phones }),
      });
      const data = await res.json();
      if (data.ok) {
        const success = data.results.filter((r: any) => r.ok);
        const failed = data.results.filter((r: any) => !r.ok);
        if (success.length > 0) {
          setCodeResults(success);
          setStep("codes");
          setInfo(`✅ تم إرسال ${success.length}/${data.total} كود${failed.length ? ` | فشل ${failed.length}` : ""}`);
        } else {
          setError(`فشل إرسال كل الأكواد. ${failed[0]?.error || ""}`);
          setInfo("");
        }
      } else { setError(data.error || "فشل"); setInfo(""); }
    } catch (e: any) { setError(e.message); setInfo(""); }
    setBusy(false);
  }

  // ─── الخطوة 2: التحقق من الأكواد ───
  async function verifyAllCodes() {
    const items = codeResults.map(r => ({
      phone: r.phone,
      code: codes[r.phone] || "",
      sessionString: r.sessionString,
      phoneCodeHash: r.phoneCodeHash,
      password: passwords[r.phone] || undefined,
    })).filter(it => it.code);

    if (!items.length) { setError("أدخل كود واحد على الأقل"); return; }
    setBusy(true); setError(""); setInfo(`⏳ جاري التحقق من ${items.length} كود...`);
    try {
      const res = await fetch("/api/accounts/multi", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk_verify", items }),
      });
      const data = await res.json();
      if (data.ok) {
        setInfo(`✅ تم تسجيل ${data.success}/${data.total} حساب بنجاح!`);
        setStep("done");
        loadAccounts();
      } else { setError(data.error || "فشل"); setInfo(""); }
    } catch (e: any) { setError(e.message); setInfo(""); }
    setBusy(false);
  }

  async function deleteAccount(id: string) {
    if (!confirm("حذف هذا الحساب؟")) return;
    try {
      await fetch("/api/accounts", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      loadAccounts();
    } catch {}
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">⏳</div>;

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-3xl mx-auto pt-20 md:pt-6 pb-24 md:pb-6">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0f0f0f] border-b border-[#262626] safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <a href="/" className="text-amber-500 text-sm">← رجوع</a>
          <h1 className="text-lg font-bold text-amber-500">👥 حسابات متعددة</h1>
          <div className="w-12"></div>
        </div>
      </div>

      <div className="text-center mb-6 hidden md:block">
        <h1 className="text-3xl font-black text-amber-500 mb-1">👥 الحسابات المتعددة</h1>
        <p className="text-sm text-neutral-500">تسجيل دخول جماعي + إدارة + rotation تلقائي ({accounts.length} حساب)</p>
      </div>

      {info && <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg p-3 mb-4 whitespace-pre-wrap break-all">{info}</div>}
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 mb-4 whitespace-pre-wrap break-all">{error}</div>}

      {/* ─── الحسابات الحالية ─── */}
      {accounts.length > 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 mb-6">
          <h3 className="font-bold text-white mb-3">📋 حساباتك ({accounts.length})</h3>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center justify-between bg-[#0a0a0a] rounded-lg p-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{a.full_name || "بدون اسم"}</p>
                  <p className="text-xs text-neutral-500 truncate" dir="ltr">{a.phone}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.status === "active" ? "bg-green-500/10 text-green-400" : "bg-neutral-500/10 text-neutral-400"}`}>{a.status === "active" ? "✓" : "⚠️"}</span>
                  <button onClick={() => deleteAccount(a.id)} className="text-xs text-red-400 px-2 py-1">🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── تبويبات الخطوات ─── */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 sm:p-6">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-5 text-xs">
          <div className={`px-3 py-1.5 rounded-full font-bold ${step === "phones" ? "bg-amber-500 text-black" : "bg-[#0a0a0a] text-neutral-500"}`}>1. الأرقام</div>
          <span className="text-neutral-700">←</span>
          <div className={`px-3 py-1.5 rounded-full font-bold ${step === "codes" ? "bg-amber-500 text-black" : "bg-[#0a0a0a] text-neutral-500"}`}>2. الأكواد</div>
          <span className="text-neutral-700">←</span>
          <div className={`px-3 py-1.5 rounded-full font-bold ${step === "done" ? "bg-amber-500 text-black" : "bg-[#0a0a0a] text-neutral-500"}`}>3. تم</div>
        </div>

        {/* Step 1: Phones */}
        {step === "phones" && (
          <div className="space-y-4">
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300/80 leading-relaxed">
              💡 أدخل قائمة أرقام الهاتف (سطر لكل رقم) أو ارفع ملف .txt يحتوي على الأرقام.
              سيتم إرسال كود تيليجرام لكل رقم.
            </div>
            <div className="flex items-center justify-between">
              <label className="block text-sm text-neutral-400">📱 قائمة الأرقام</label>
              <button onClick={() => fileRef.current?.click()} className="text-xs text-amber-500 hover:underline">📁 رفع ملف</button>
              <input ref={fileRef} type="file" accept=".txt,.csv" onChange={handleFile} className="hidden" />
            </div>
            <textarea
              className="w-full bg-[#0a0a0a] text-white text-sm font-mono rounded-lg px-3 py-3 border border-[#333] focus:border-amber-500/50 focus:outline-none resize-y min-h-[200px]"
              placeholder={"+9665XXXXXXXX\n+9665YYYYYYYY\n+9665ZZZZZZZZ"}
              value={phonesText}
              onChange={e => setPhonesText(e.target.value)}
              dir="ltr"
              spellCheck={false}
            />
            <p className="text-[11px] text-neutral-500">{phonesText.split("\n").filter(l => l.trim()).length} رقم</p>
            <button onClick={sendAllCodes} disabled={busy || !phonesText.trim()} className="w-full bg-amber-500 text-black font-bold rounded-lg py-3 text-base hover:bg-amber-400 transition-colors disabled:opacity-50 active:scale-95">
              {busy ? "⏳ جاري الإرسال..." : "📨 إرسال الأكواد للكل"}
            </button>
            <p className="text-[11px] text-neutral-600 text-center">⏱️ تأخير 5 ثواني بين كل رقم (لتفادي Flood)</p>
          </div>
        )}

        {/* Step 2: Codes */}
        {step === "codes" && (
          <div className="space-y-4">
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300/80 leading-relaxed">
              ✅ تم إرسال الأكواد إلى {codeResults.length} رقم. أدخل الأكواد التي وصلتك في تيليجرام.
              <br />💡 لو الحساب مفعّل عليه 2FA، أدخل كلمة المرور أيضاً.
            </div>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {codeResults.map(r => (
                <div key={r.phone} className="bg-[#0a0a0a] rounded-lg p-3 space-y-2">
                  <p className="text-sm text-white font-mono" dir="ltr">{r.phone}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      className="bg-[#141414] text-white text-center text-lg tracking-widest font-mono rounded px-3 py-2 border border-[#333] focus:border-amber-500/50 focus:outline-none"
                      placeholder="كود"
                      maxLength={6}
                      value={codes[r.phone] || ""}
                      onChange={e => setCodes({ ...codes, [r.phone]: e.target.value.replace(/\D/g, "") })}
                      dir="ltr"
                    />
                    <input
                      type="password"
                      className="bg-[#141414] text-white text-sm rounded px-3 py-2 border border-[#333] focus:border-amber-500/50 focus:outline-none"
                      placeholder="2FA (اختياري)"
                      value={passwords[r.phone] || ""}
                      onChange={e => setPasswords({ ...passwords, [r.phone]: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={verifyAllCodes} disabled={busy} className="w-full bg-amber-500 text-black font-bold rounded-lg py-3 text-base hover:bg-amber-400 transition-colors disabled:opacity-50 active:scale-95">
              {busy ? "⏳ جاري التحقق..." : "✓ تسجيل الكل"}
            </button>
            <button onClick={() => { setStep("phones"); setError(""); setInfo(""); }} className="w-full text-sm text-neutral-500 hover:text-white">
              ← رجوع للأرقام
            </button>
          </div>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-lg font-bold text-white mb-2">تم تسجيل الحسابات!</p>
            <p className="text-sm text-neutral-500 mb-6">الآن يمكنك استخدام الحسابات المتعددة في السحب والإضافة</p>
            <div className="flex flex-col gap-2">
              <a href="/" className="bg-amber-500 text-black font-bold rounded-lg py-3 text-base hover:bg-amber-400 transition-colors">
                ← العودة للأوامر
              </a>
              <button onClick={() => { setStep("phones"); setPhonesText(""); setCodeResults([]); setCodes({}); setPasswords({}); setInfo(""); }} className="text-sm text-amber-500 hover:underline">
                + إضافة المزيد من الحسابات
              </button>
            </div>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 mt-6">
        <h3 className="font-bold text-white mb-2 text-sm">💡 كيف يعمل نظام الحسابات المتعددة؟</h3>
        <ol className="text-xs text-neutral-400 space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>سجّل دخول عدة حسابات من هذه الصفحة (تسجيل جماعي)</li>
          <li>عند تنفيذ أمر سحب: النظام يستخدم <span className="text-amber-400">rotation تلقائي</span> بين الحسابات</li>
          <li>عند تنفيذ أمر إضافة: النظام <span className="text-amber-400">يبدّل الحساب تلقائياً</span> عند Flood أو كثرة الأخطاء</li>
          <li>كل حساب له إحصائيات منفصلة (سحب/إضافة/أخطاء)</li>
          <li>الحسابات في حالة Flood تُستبعد تلقائياً حتى تنتهي مدة الانتظار</li>
        </ol>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f0f0f] border-t border-[#262626] safe-bottom">
        <div className="flex items-center justify-around py-2">
          <a href="/" className="flex flex-col items-center gap-0.5 px-2 py-1"><span className="text-lg">🏠</span><span className="text-[10px] text-neutral-400">الرئيسية</span></a>
          <a href="/accounts" className="flex flex-col items-center gap-0.5 px-2 py-1"><span className="text-lg">📱</span><span className="text-[10px] text-neutral-400">حسابات</span></a>
          <div className="flex flex-col items-center gap-0.5 px-2 py-1"><span className="text-lg text-amber-500">👥</span><span className="text-[10px] text-amber-500">متعدد</span></div>
          <a href="/blacklist" className="flex flex-col items-center gap-0.5 px-2 py-1"><span className="text-lg">🚫</span><span className="text-[10px] text-neutral-400">سوداء</span></a>
          <a href="/subscription" className="flex flex-col items-center gap-0.5 px-2 py-1"><span className="text-lg">💳</span><span className="text-[10px] text-neutral-400">اشتراك</span></a>
        </div>
      </div>
    </div>
  );
}
