"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, COMMANDS, getCommandsByCategory, Command } from "@/lib/commands";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [executing, setExecuting] = useState(false);
  const [output, setOutput] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.ok) { router.push("/login"); return; }
      setUser(d.user);
      setLoading(false);
      loadAccounts();
    }).catch(() => router.push("/login"));
  }, []);

  async function loadAccounts() {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.ok) {
        setAccounts(data.accounts);
        if (data.accounts.length > 0) setSelectedAccount(data.accounts[0].id);
      }
    } catch {}
  }

  const filteredCommands = searchQuery
    ? COMMANDS.filter(c =>
        c.nameAr.includes(searchQuery) ||
        c.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.key.includes(searchQuery)
      )
    : activeCategory
      ? getCommandsByCategory(activeCategory)
      : [];

  async function executeCommand() {
    if (!selectedCommand || !selectedAccount) return;
    setExecuting(true);
    setOutput("⏳ جاري التنفيذ...");
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccount,
          commandKey: selectedCommand.key,
          params: formValues,
        }),
      });
      const data = await res.json();
      setOutput(data.output || data.error || "تم");
    } catch (e: any) {
      setOutput("❌ " + e.message);
    }
    setExecuting(false);
  }

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" }).catch(() => {});
    document.cookie = "njadder_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">⏳</div>;

  const sortedCats = [...CATEGORIES].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen pb-20 md:pb-6">
      {/* ─── Top Bar (always visible) ─── */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#1a1a1a] safe-top">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Logo */}
          <h1 className="text-xl font-black text-amber-500 shrink-0">NJADDER</h1>

          {/* Search */}
          <input
            type="text"
            placeholder="🔍 بحث..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setActiveCategory(null); setSelectedCommand(null); setOutput(""); }}
            className="flex-1 max-w-xs bg-[#141414] text-white text-sm rounded-full px-4 py-2 border border-[#222] focus:border-amber-500/30 focus:outline-none"
          />

          {/* User + links */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-xs text-neutral-500">{user?.username}</span>
            {user?.role === "admin" && <a href="/admin" className="text-xs text-neutral-400 hover:text-amber-500">⚙️</a>}
            <a href="/subscription" className="text-xs text-neutral-400 hover:text-amber-500">💳</a>
            <a href="/accounts" className="text-xs text-neutral-400 hover:text-amber-500">📱</a>
            <button onClick={logout} className="text-xs text-neutral-500 hover:text-red-400">🚪</button>
          </div>
        </div>

        {/* ─── Category Tabs (horizontal scroll) ─── */}
        {!selectedCommand && (
          <div className="border-t border-[#1a1a1a]">
            <div className="max-w-6xl mx-auto px-2 flex items-center gap-1 overflow-x-auto py-2" style={{ scrollbarWidth: "none" }}>
              <button
                onClick={() => { setActiveCategory(null); setSearchQuery(""); }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  !activeCategory && !searchQuery ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-white hover:bg-[#1a1a1a]"
                }`}
              >
                🏠 الرئيسية
              </button>
              {sortedCats.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => { setActiveCategory(cat.key); setSearchQuery(""); setSelectedCommand(null); setOutput(""); }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    activeCategory === cat.key ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-white hover:bg-[#1a1a1a]"
                  }`}
                >
                  {cat.nameAr} <span className="opacity-50">{getCommandsByCategory(cat.key).length}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ─── Main Content ─── */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {!selectedCommand ? (
          <>
            {/* Title */}
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-black text-white">
                {searchQuery ? `🔍 نتائج البحث (${filteredCommands.length})` : activeCategory ? sortedCats.find(c => c.key === activeCategory)?.nameAr : "🏆 لوحة التحكم"}
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                {searchQuery ? `بحث: "${searchQuery}"` : activeCategory ? sortedCats.find(c => c.key === activeCategory)?.nameEn : "118 أمر في 14 فئة"}
              </p>
            </div>

            {/* Dashboard */}
            {!activeCategory && !searchQuery && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {sortedCats.map(cat => {
                  const count = getCommandsByCategory(cat.key).length;
                  return (
                    <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                      className="group bg-[#141414] border border-[#1a1a1a] rounded-2xl p-4 hover:border-amber-500/30 hover:bg-[#1a1a1a] transition-all text-center">
                      <div className="text-2xl mb-1 font-black" style={{ color: cat.accent }}>{cat.range.split("-")[0]}</div>
                      <h3 className="font-bold text-white text-xs mb-0.5 group-hover:text-amber-500">{cat.nameAr}</h3>
                      <span className="text-[10px] text-neutral-600">{count} أمر</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Commands Grid */}
            {(activeCategory || searchQuery) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCommands.map(cmd => (
                  <button key={cmd.id} onClick={() => { setSelectedCommand(cmd); setFormValues({}); setOutput(""); }}
                    className="group bg-[#141414] border border-[#1a1a1a] rounded-xl p-4 hover:border-amber-500/30 hover:bg-[#1a1a1a] transition-all text-right">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-neutral-600 bg-[#0a0a0a] px-1.5 py-0.5 rounded">{cmd.id}</span>
                      {cmd.risk === "high" && <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">⚠️</span>}
                      {cmd.risk === "medium" && <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">⚡</span>}
                    </div>
                    <h3 className="font-bold text-white text-sm mb-1 group-hover:text-amber-500">{cmd.nameAr}</h3>
                    <p className="text-xs text-neutral-500 mb-2">{cmd.nameEn}</p>
                    <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">{cmd.description}</p>
                    {cmd.fields.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {cmd.fields.slice(0, 3).map(f => <span key={f.name} className="text-[10px] text-neutral-600 bg-[#0a0a0a] px-1.5 py-0.5 rounded">{f.label}</span>)}
                        {cmd.fields.length > 3 && <span className="text-[10px] text-neutral-700">+{cmd.fields.length - 3}</span>}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          /* ─── Command Execution View ─── */
          <div className="max-w-2xl mx-auto">
            <button onClick={() => { setSelectedCommand(null); setOutput(""); }}
              className="text-sm text-neutral-500 hover:text-amber-500 mb-4">← رجوع</button>

            <div className="bg-[#141414] border border-[#1a1a1a] rounded-2xl p-5 mb-4">
              <h2 className="text-xl font-black text-white mb-1">{selectedCommand.nameAr}</h2>
              <p className="text-sm text-neutral-500">{selectedCommand.description}</p>
            </div>

            {/* Account selector */}
            <div className="bg-[#141414] border border-[#1a1a1a] rounded-2xl p-4 mb-4">
              <label className="block text-sm text-neutral-400 mb-2">📱 الحساب</label>
              {accounts.length === 0 ? (
                <a href="/accounts" className="text-sm text-amber-500 hover:underline">لا يوجد حسابات — أضف حساباً ←</a>
              ) : (
                <select
                  value={selectedAccount}
                  onChange={e => setSelectedAccount(e.target.value)}
                  className="w-full bg-[#0a0a0a] text-white rounded-lg px-3 py-2.5 border border-[#222] focus:border-amber-500/30 focus:outline-none"
                >
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.full_name || a.phone}</option>)}
                </select>
              )}
            </div>

            {/* Form fields */}
            {selectedCommand.fields.length > 0 && (
              <div className="bg-[#141414] border border-[#1a1a1a] rounded-2xl p-4 mb-4 space-y-3">
                {selectedCommand.fields.map(field => (
                  <div key={field.name}>
                    <label className="block text-sm text-neutral-300 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-400 mr-1">*</span>}
                    </label>
                    {field.type === "textarea" ? (
                      <>
                        <textarea
                          className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2 border border-[#222] focus:border-amber-500/30 focus:outline-none"
                          placeholder={field.placeholder}
                          dir="ltr"
                          rows={4}
                          value={formValues[field.name] || ""}
                          onChange={e => setFormValues({ ...formValues, [field.name]: e.target.value })}
                        />
                        <label className="mt-2 flex items-center justify-center gap-2 w-full bg-[#1a1a1a] text-neutral-400 text-xs rounded-lg py-2 border border-[#222] hover:border-amber-500/30 hover:text-amber-500 transition-colors cursor-pointer">
                          📎 تحميل ملف CSV/TXT
                          <input type="file" accept=".csv,.txt" className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const text = ev.target?.result as string;
                                setFormValues({ ...formValues, [field.name]: text.trim() });
                              };
                              reader.readAsText(file);
                            }}
                          />
                        </label>
                        {formValues[field.name] && (
                          <p className="text-[10px] text-green-400 mt-1">✓ {formValues[field.name].split("\n").filter(l => l.trim()).length} سطر</p>
                        )}
                      </>
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : field.type === "tel" ? "tel" : "text"}
                        className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2 border border-[#222] focus:border-amber-500/30 focus:outline-none"
                        placeholder={field.placeholder}
                        value={formValues[field.name] ?? field.default ?? ""}
                        onChange={e => setFormValues({ ...formValues, [field.name]: e.target.value })}
                        dir={field.type === "tel" || field.type === "url" ? "ltr" : "rtl"}
                      />
                    )}
                    {field.helper && <p className="text-[10px] text-neutral-600 mt-1">{field.helper}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Execute */}
            <button
              onClick={executeCommand}
              disabled={executing || !selectedAccount}
              className="w-full bg-amber-500 text-black font-bold rounded-xl py-3 hover:bg-amber-400 transition-colors disabled:opacity-50 active:scale-[0.98] mb-4"
            >
              {executing ? "⏳ جاري التنفيذ..." : "⚡ تنفيذ الأمر"}
            </button>

            {/* Output */}
            {output && (
              <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4">
                <h3 className="text-sm font-bold text-amber-500 mb-2">📤 النتيجة</h3>
                <pre className="text-sm text-neutral-300 whitespace-pre-wrap font-mono" dir="ltr">{output}</pre>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── Mobile Bottom Nav ─── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-[#1a1a1a] safe-bottom">
        <div className="flex items-center justify-around py-2">
          <button onClick={() => { setActiveCategory(null); setSearchQuery(""); setSelectedCommand(null); setOutput(""); }} className="flex flex-col items-center gap-0.5 px-3 py-1">
            <span className="text-lg">🏠</span><span className="text-[10px] text-neutral-400">الرئيسية</span>
          </button>
          <a href="/accounts" className="flex flex-col items-center gap-0.5 px-3 py-1">
            <span className="text-lg">📱</span><span className="text-[10px] text-neutral-400">حسابات</span>
          </a>
          <a href="/subscription" className="flex flex-col items-center gap-0.5 px-3 py-1">
            <span className="text-lg">💳</span><span className="text-[10px] text-neutral-400">اشتراك</span>
          </a>
          <button onClick={logout} className="flex flex-col items-center gap-0.5 px-3 py-1">
            <span className="text-lg">🚪</span><span className="text-[10px] text-neutral-400">خروج</span>
          </button>
        </div>
      </div>
    </div>
  );
}
