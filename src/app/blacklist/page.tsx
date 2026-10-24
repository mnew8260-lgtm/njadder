"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function BlacklistPage() {
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [search, setSearch] = useState("");

  // إضافة واحدة
  const [tid, setTid] = useState("");
  const [reason, setReason] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  // إضافة جماعية
  const [bulkText, setBulkText] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);

  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.ok) { router.push("/login"); return; }
      // 🛡️ SaaS: فحص الاشتراك
      const state = d.user.subscriptionState;
      if (state === "banned" || state === "expired") { router.push("/subscribe"); return; }
      // التحقق من حالة الموافقة
      if (d.user.role !== "admin" && (d.user.status === "pending" || d.user.status === "rejected")) {
        router.push("/pending"); return;
      }
      setUser(d.user); setLoading(false); load();
    });
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/blacklist");
      const data = await res.json();
      if (data.ok) { setItems(data.items || []); setCount(data.count || 0); }
    } catch {}
  }

  async function addSingle() {
    if (!tid.trim()) { setError("أدخل معرّف تيليجرام (Telegram ID)"); return; }
    setBusy(true); setError(""); setInfo("⏳ جاري الإضافة...");
    try {
      const res = await fetch("/api/blacklist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", telegramId: tid.trim(), reason, fullName, username }),
      });
      const data = await res.json();
      if (data.ok) {
        setInfo("✅ تمت الإضافة");
        setTid(""); setReason(""); setFullName(""); setUsername("");
        load();
      } else setError(data.error || "فشل");
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  }

  async function addBulk() {
    if (!bulkText.trim()) { setError("الصق قائمة المعرّفات"); return; }
    setBusy(true); setError(""); setInfo("⏳ جاري الإضافة الجماعية...");
    try {
      const res = await fetch("/api/blacklist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk", bulkText, reason: bulkReason }),
      });
      const data = await res.json();
      if (data.ok) {
        const errs = data.errors?.length ? `\n⚠️ أخطاء:\n${data.errors.slice(0, 5).join("\n")}` : "";
        setInfo(`✅ تمت إضافة ${data.added} معرّف. تخطّي: ${data.skipped}.${errs}`);
        setBulkText(""); setBulkReason("");
        load();
      } else setError(data.error || "فشل");
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  }

  async function removeItem(id: string) {
    if (!confirm("حذف من القائمة السوداء؟")) return;
    try {
      await fetch("/api/blacklist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      load();
    } catch {}
  }

  async function clearAll() {
    if (!confirm(`حذف كل ${count} عنصر من القائمة السوداء؟ لا يمكن التراجع.`)) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/blacklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clear" }) });
      const data = await res.json();
      if (data.ok) { setInfo(`✅ تم حذف ${data.cleared} عنصر`); load(); }
      else setError(data.error || "فشل");
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  }

  // تصدير CSV
  function exportCSV() {
    const rows = [["telegram_id", "full_name", "username", "reason", "added_at"]];
    items.forEach(it => {
      rows.push([
        it.telegram_id,
        it.full_name || "",
        it.username || "",
        it.reason || "",
        new Date(Number(it.created_at)).toISOString(),
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `blacklist_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // استيراد ملف
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    try {
      const text = await f.text();
      setBulkText(text);
      setBulkOpen(true);
      setInfo(`📄 تم تحميل ${f.name} (${text.split("\n").filter(l => l.trim()).length} سطر). اضغط "إضافة جماعية" للمتابعة.`);
    } catch (e: any) { setError("فشل قراءة الملف: " + e.message); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">⏳</div>;

  // فلترة بحث
  const filtered = search
    ? items.filter(it => String(it.telegram_id).includes(search) || (it.full_name || "").includes(search) || (it.username || "").includes(search) || (it.reason || "").includes(search))
    : items;

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-3xl mx-auto pt-20 md:pt-6 pb-24 md:pb-6">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0f0f0f] border-b border-[#262626] safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <a href="/" className="text-amber-500 text-sm">← رجوع</a>
          <h1 className="text-lg font-bold text-amber-500">🚫 القائمة السوداء</h1>
          <div className="w-12"></div>
        </div>
      </div>

      {/* Desktop header */}
      <div className="text-center mb-6 hidden md:block">
        <h1 className="text-3xl font-black text-amber-500 mb-1">🚫 القائمة السوداء</h1>
        <p className="text-sm text-neutral-500">عدد المحظورين: {count}</p>
      </div>

      {info && <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg p-3 mb-4 whitespace-pre-wrap break-all">{info}</div>}
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 mb-4 whitespace-pre-wrap break-all">{error}</div>}

      {/* ─── البطاقة: إضافة عناصر ─── */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 sm:p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white">➕ إضافة للقائمة السوداء</h3>
          <button
            onClick={() => setBulkOpen(!bulkOpen)}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${bulkOpen ? "bg-amber-500 text-black" : "bg-[#0a0a0a] text-amber-400 hover:bg-[#1a1a1a]"}`}
          >
            📋 إضافة جماعية {bulkOpen ? "▲" : "▼"}
          </button>
        </div>

        {/* إضافة واحدة */}
        {!bulkOpen && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">🆔 Telegram ID *</label>
                <input type="text" className="w-full bg-[#0a0a0a] text-white text-base rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none" placeholder="123456789" value={tid} onChange={e => setTid(e.target.value)} dir="ltr" />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">📝 السبب</label>
                <input type="text" className="w-full bg-[#0a0a0a] text-white text-base rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none" placeholder="سبام / احتيال / مخالف..." value={reason} onChange={e => setReason(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">👤 الاسم (اختياري)</label>
                <input type="text" className="w-full bg-[#0a0a0a] text-white text-base rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none" placeholder="الاسم الكامل" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">@ اليوزر (اختياري)</label>
                <input type="text" className="w-full bg-[#0a0a0a] text-white text-base rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none" placeholder="@username" value={username} onChange={e => setUsername(e.target.value)} dir="ltr" />
              </div>
            </div>
            <button onClick={addSingle} disabled={busy || !tid.trim()} className="w-full bg-amber-500 text-black font-bold rounded-lg py-3 text-base hover:bg-amber-400 transition-colors disabled:opacity-50 active:scale-95">
              {busy ? "⏳ جاري..." : "🚫 إضافة للقائمة"}
            </button>
          </div>
        )}

        {/* إضافة جماعية */}
        {bulkOpen && (
          <div className="space-y-3">
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300/80 leading-relaxed">
              💡 الصيغ المدعومة (سطر لكل عنصر):
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-neutral-400" dir="ltr">
                <li><code className="text-amber-400">123456789</code></li>
                <li><code className="text-amber-400">123456789,الأسم</code></li>
                <li><code className="text-amber-400">123456789;@username</code></li>
              </ul>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-neutral-400">📋 قائمة المعرّفات</label>
                <button onClick={() => fileRef.current?.click()} className="text-xs text-amber-500 hover:underline">📁 رفع ملف</button>
                <input ref={fileRef} type="file" accept=".txt,.csv,text/plain,text/csv" onChange={onFile} className="hidden" />
              </div>
              <textarea
                className="w-full bg-[#0a0a0a] text-white text-sm font-mono rounded-lg px-3 py-3 border border-[#333] focus:border-amber-500/50 focus:outline-none resize-y min-h-[180px]"
                placeholder={"123456789\n987654321,محمد\n555444333;@user1"}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                dir="ltr"
                spellCheck={false}
              />
              <p className="text-[11px] text-neutral-500 mt-1">{bulkText.split("\n").filter(l => l.trim()).length} سطر</p>
            </div>
            <input type="text" className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none" placeholder="السبب (يُطبَّق على الكل)" value={bulkReason} onChange={e => setBulkReason(e.target.value)} />
            <button onClick={addBulk} disabled={busy || !bulkText.trim()} className="w-full bg-amber-500 text-black font-bold rounded-lg py-3 text-base hover:bg-amber-400 transition-colors disabled:opacity-50 active:scale-95">
              {busy ? "⏳ جاري الإضافة..." : "📋 إضافة الكل للقائمة"}
            </button>
          </div>
        )}
      </div>

      {/* ─── البطاقة: قائمة المحظورين ─── */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h3 className="font-bold text-white text-sm sm:text-base">📋 المحظورون ({count})</h3>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} disabled={!items.length} className="text-xs text-amber-500 hover:underline disabled:opacity-30">⬇️ CSV</button>
            <button onClick={clearAll} disabled={!items.length || busy} className="text-xs text-red-400 hover:underline disabled:opacity-30">🗑 حذف الكل</button>
          </div>
        </div>

        {/* بحث */}
        {items.length > 0 && (
          <input
            type="text"
            placeholder="🔍 بحث في القائمة..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2 border border-[#333] focus:border-amber-500/50 focus:outline-none mb-3"
          />
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-10 text-neutral-600 text-sm">
            {items.length === 0 ? "🚫 لا يوجد محظورون بعد — أضف أول معرّف فوق" : "🔍 لا نتائج للبحث"}
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filtered.map(it => (
              <div key={it.id} className="flex items-start justify-between bg-[#0a0a0a] rounded-lg p-3 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white font-mono" dir="ltr">{it.telegram_id}</span>
                    {it.username && <span className="text-xs text-amber-400" dir="ltr">{it.username}</span>}
                  </div>
                  {it.full_name && <p className="text-xs text-neutral-300 mt-0.5 truncate">{it.full_name}</p>}
                  {it.reason && <p className="text-[11px] text-neutral-500 mt-0.5">📝 {it.reason}</p>}
                  <p className="text-[10px] text-neutral-600 mt-1" dir="ltr">{new Date(Number(it.created_at)).toLocaleString("ar")}</p>
                </div>
                <button onClick={() => removeItem(it.id)} className="text-xs text-red-400 px-2 py-1 hover:bg-red-500/10 rounded shrink-0">🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* كيفية الاستخدام */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 mt-6">
        <h3 className="font-bold text-white mb-2 text-sm">💡 كيف تعمل القائمة السوداء؟</h3>
        <ol className="text-xs text-neutral-400 space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>أضف معرّفات تيليجرام (Telegram ID) للقائمة السوداء — واحدة أو جماعية من ملف</li>
          <li>عند تنفيذ أوامر الإضافة (مثل: <span className="text-amber-400">إضافة فردية</span>، <span className="text-amber-400">إضافة جماعية</span>، إلخ) سيتخطّى النظام تلقائياً أي معرّف موجود في قائمتك السوداء</li>
          <li>هذا يحميك من إضافة حسابات مزعجة أو احتيالية أو محظورة سابقاً</li>
          <li>يمكنك تصدير القائمة كـ CSV أو حذف عنصر أو حذف الكل</li>
        </ol>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f0f0f] border-t border-[#262626] safe-bottom">
        <div className="flex items-center justify-around py-2">
          <a href="/" className="flex flex-col items-center gap-0.5 px-3 py-1"><span className="text-lg">🏠</span><span className="text-[10px] text-neutral-400">الرئيسية</span></a>
          <a href="/accounts" className="flex flex-col items-center gap-0.5 px-3 py-1"><span className="text-lg">📱</span><span className="text-[10px] text-neutral-400">حسابات</span></a>
          <div className="flex flex-col items-center gap-0.5 px-3 py-1"><span className="text-lg text-amber-500">🚫</span><span className="text-[10px] text-amber-500">سوداء</span></div>
          <a href="/subscription" className="flex flex-col items-center gap-0.5 px-3 py-1"><span className="text-lg">💳</span><span className="text-[10px] text-neutral-400">اشتراك</span></a>
          <a href="/" className="flex flex-col items-center gap-0.5 px-3 py-1"><span className="text-lg">🚪</span><span className="text-[10px] text-neutral-400">خروج</span></a>
        </div>
      </div>
    </div>
  );
}
