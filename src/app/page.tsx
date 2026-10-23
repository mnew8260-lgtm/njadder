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
  const [showAccounts, setShowAccounts] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  return (
    <div className="min-h-screen">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0f0f0f] border-b border-[#262626] safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-black text-amber-500">NJADDER</h1>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white p-2 rounded-lg bg-[#1a1a1a]"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Slide-out Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute top-0 right-0 bottom-0 w-72 bg-[#0f0f0f] border-l border-[#262626] overflow-y-auto safe-top"
            onClick={e => e.stopPropagation()}
          >
            <MobileMenu
              user={user}
              activeCategory={activeCategory}
              searchQuery={searchQuery}
              setActiveCategory={(c) => { setActiveCategory(c); setSearchQuery(""); setSelectedCommand(null); setOutput(""); setMobileMenuOpen(false); }}
              setSearchQuery={(q) => { setSearchQuery(q); setActiveCategory(null); setMobileMenuOpen(false); }}
              logout={logout}
            />
          </div>
        </div>
      )}

      <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#0f0f0f] border-l border-[#262626] flex-col fixed h-full overflow-y-auto">
        <div className="p-5 border-b border-[#262626]">
          <h1 className="text-2xl font-black text-amber-500">NJADDER</h1>
          <p className="text-xs text-neutral-500 mt-1">PRO v7.0 — 118 أمر</p>
        </div>

        {/* User info */}
        <div className="p-3 border-b border-[#262626]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">{user?.username}</p>
              <p className="text-[10px] text-amber-500">{user?.role === "admin" ? "👑 أدمن" : "👤 مستخدم"}</p>
            </div>
            <button onClick={logout} className="text-xs text-neutral-500 hover:text-red-400">خروج</button>
          </div>
        </div>

        {/* Account selector */}
        <div className="p-3 border-b border-[#262626]">
          <button
            onClick={() => setShowAccounts(!showAccounts)}
            className="w-full text-right text-xs text-neutral-400 hover:text-white flex items-center justify-between"
          >
            <span>📱 الحساب</span>
            <span>{accounts.length}</span>
          </button>
          {showAccounts && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {accounts.length === 0 ? (
                <p className="text-[10px] text-neutral-600 text-center py-2">لا توجد حسابات</p>
              ) : (
                accounts.map(a => (
                  <label key={a.id} className="flex items-center gap-2 p-1 rounded hover:bg-[#1a1a1a] cursor-pointer">
                    <input
                      type="radio"
                      checked={selectedAccount === a.id}
                      onChange={() => setSelectedAccount(a.id)}
                      className="rounded"
                    />
                    <span className="text-xs text-neutral-300 flex-1 truncate">{a.full_name || a.phone}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#262626]">
          <input
            type="text"
            placeholder="🔍 بحث..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setActiveCategory(null); }}
            className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg px-3 py-2 border border-[#333] focus:border-amber-500/50 focus:outline-none"
          />
        </div>

        {/* Categories */}
        <nav className="flex-1 p-2 space-y-1">
          <button
            onClick={() => { setActiveCategory(null); setSearchQuery(""); setSelectedCommand(null); setOutput(""); }}
            className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              !activeCategory && !searchQuery ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-neutral-400 hover:bg-[#1a1a1a] hover:text-white"
            }`}
          >
            🏠 الرئيسية
          </button>
          {CATEGORIES.sort((a, b) => a.order - b.order).map(cat => (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setSearchQuery(""); setSelectedCommand(null); setOutput(""); }}
              className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${
                activeCategory === cat.key ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-neutral-400 hover:bg-[#1a1a1a] hover:text-white"
              }`}
            >
              <span>{cat.nameAr}</span>
              <span className="text-[10px] text-neutral-600">{getCommandsByCategory(cat.key).length}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-[#262626] space-y-2">
          <a href="/accounts" className="block text-center text-xs text-amber-500 hover:text-amber-400">📱 إضافة حساب</a>
          <a href="/subscription" className="block text-center text-xs text-amber-500 hover:text-amber-400">💳 الاشتراك</a>
          {user?.role === "admin" && (
            <a href="/admin" className="block text-center text-xs text-neutral-400 hover:text-white">⚙️ الأدمن</a>
          )}
          <p className="text-[10px] text-neutral-600 text-center">@NMDDER_DEV</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:mr-64 pt-16 md:pt-0 p-4 md:p-6 overflow-y-auto pb-20 md:pb-6">
        {!selectedCommand ? (
          <>
            <header className="mb-6">
              <h2 className="text-2xl md:text-3xl font-black text-white">
                {searchQuery ? `🔍 نتائج البحث (${filteredCommands.length})` : activeCategory ? CATEGORIES.find(c => c.key === activeCategory)?.nameAr : "🏆 لوحة التحكم"}
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                {searchQuery ? `بحث: "${searchQuery}"` : activeCategory ? CATEGORIES.find(c => c.key === activeCategory)?.nameEn : "118 أمر في 14 فئة"}
              </p>
            </header>

            {/* Dashboard */}
            {!activeCategory && !searchQuery && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {CATEGORIES.sort((a, b) => a.order - b.order).map(cat => {
                  const count = getCommandsByCategory(cat.key).length;
                  return (
                    <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                      className="group bg-[#141414] border border-[#262626] rounded-xl p-5 hover:border-amber-500/30 hover:bg-[#1a1a1a] transition-all text-right">
                      <div className="text-3xl mb-2" style={{ color: cat.accent }}>{cat.range.split("-")[0]}</div>
                      <h3 className="font-bold text-white text-sm mb-1 group-hover:text-amber-400">{cat.nameAr}</h3>
                      <p className="text-xs text-neutral-500">{cat.nameEn}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-amber-500/70 font-mono">{cat.range}</span>
                        <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">{count} أمر</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Commands Grid */}
            {(activeCategory || searchQuery) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {filteredCommands.map(cmd => (
                  <button key={cmd.id} onClick={() => { setSelectedCommand(cmd); setFormValues({}); setOutput(""); }}
                    className="group bg-[#141414] border border-[#262626] rounded-xl p-4 hover:border-amber-500/30 hover:bg-[#1a1a1a] transition-all text-right">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[10px] font-mono text-neutral-600 bg-[#1a1a1a] px-1.5 py-0.5 rounded">{cmd.id}</span>
                      {cmd.risk === "high" && <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">⚠️ خطر</span>}
                      {cmd.risk === "medium" && <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">⚡ متوسط</span>}
                    </div>
                    <h3 className="font-bold text-white text-sm mb-1 group-hover:text-amber-400">{cmd.nameAr}</h3>
                    <p className="text-xs text-neutral-500 mb-2">{cmd.nameEn}</p>
                    <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">{cmd.description}</p>
                    {cmd.fields.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {cmd.fields.slice(0, 3).map(f => <span key={f.name} className="text-[10px] text-neutral-500 bg-[#0a0a0a] px-1.5 py-0.5 rounded">{f.label}</span>)}
                        {cmd.fields.length > 3 && <span className="text-[10px] text-neutral-600">+{cmd.fields.length - 3}</span>}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Command Execution View */
          <div className="max-w-3xl">
            <button onClick={() => { setSelectedCommand(null); setOutput(""); }}
              className="text-sm text-neutral-500 hover:text-white mb-4">← رجوع</button>
            <h2 className="text-2xl font-black text-white mb-1">{selectedCommand.nameAr}</h2>
            <p className="text-sm text-neutral-500 mb-4">{selectedCommand.description}</p>

            {/* Account selector */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 mb-4">
              <label className="block text-sm text-neutral-400 mb-2">📱 الحساب</label>
              {accounts.length === 0 ? (
                <p className="text-sm text-red-400">لا يوجد حسابات تيليجرام. أضف حساباً أولاً.</p>
              ) : (
                <select
                  value={selectedAccount}
                  onChange={e => setSelectedAccount(e.target.value)}
                  className="w-full bg-[#0a0a0a] text-white rounded-lg px-3 py-2 border border-[#333] focus:border-amber-500/50 focus:outline-none"
                >
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.full_name || a.phone}</option>)}
                </select>
              )}
            </div>

            {/* Form fields */}
            {selectedCommand.fields.length > 0 && (
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 mb-4 space-y-3">
                {selectedCommand.fields.map(field => (
                  <div key={field.name}>
                    <label className="block text-sm text-neutral-300 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-400 mr-1">*</span>}
                    </label>
                    {field.type === "textarea" ? (
                      <>
                        <textarea
                          className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2 border border-[#333] focus:border-amber-500/50 focus:outline-none"
                          placeholder={field.placeholder}
                          dir="ltr"
                          rows={4}
                          value={formValues[field.name] || ""}
                          onChange={e => setFormValues({ ...formValues, [field.name]: e.target.value })}
                        />
                        <label className="mt-2 flex items-center justify-center gap-2 w-full bg-[#1a1a1a] text-neutral-400 text-xs rounded-lg py-2 border border-[#333] hover:border-amber-500/30 hover:text-amber-400 transition-colors cursor-pointer">
                          📎 تحميل ملف CSV/TXT
                          <input
                            type="file"
                            accept=".csv,.txt"
                            className="hidden"
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
                          <p className="text-[10px] text-green-400 mt-1">
                            ✓ تم تحميل {formValues[field.name].split("\n").filter(l => l.trim()).length} سطر
                          </p>
                        )}
                      </>
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : field.type === "tel" ? "tel" : "text"}
                        className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2 border border-[#333] focus:border-amber-500/50 focus:outline-none"
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

            {/* Execute button */}
            <button
              onClick={executeCommand}
              disabled={executing || !selectedAccount}
              className="w-full bg-amber-500 text-black font-bold rounded-xl py-3 hover:bg-amber-400 transition-colors disabled:opacity-50 mb-4"
            >
              {executing ? "⏳ جاري التنفيذ..." : "⚡ تنفيذ الأمر"}
            </button>

            {/* Output */}
            {output && (
              <div className="bg-[#0a0a0a] border border-[#333] rounded-xl p-4">
                <h3 className="text-sm font-bold text-amber-500 mb-2">📤 النتيجة</h3>
                <pre className="text-sm text-neutral-300 whitespace-pre-wrap font-mono dir-ltr" dir="ltr">{output}</pre>
              </div>
            )}
          </div>
        )}
      </main>
      </div>{/* end min-h-screen flex */}

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f0f0f] border-t border-[#262626] safe-bottom">
        <div className="flex items-center justify-around py-2">
          <button onClick={() => { setActiveCategory(null); setSearchQuery(""); setSelectedCommand(null); setOutput(""); }} className="flex flex-col items-center gap-0.5 px-3 py-1">
            <span className="text-lg">🏠</span>
            <span className="text-[10px] text-neutral-400">الرئيسية</span>
          </button>
          <a href="/accounts" className="flex flex-col items-center gap-0.5 px-3 py-1">
            <span className="text-lg">📱</span>
            <span className="text-[10px] text-neutral-400">حسابات</span>
          </a>
          <a href="/subscription" className="flex flex-col items-center gap-0.5 px-3 py-1">
            <span className="text-lg">💳</span>
            <span className="text-[10px] text-neutral-400">اشتراك</span>
          </a>
          {user?.role === "admin" && (
            <a href="/admin" className="flex flex-col items-center gap-0.5 px-3 py-1">
              <span className="text-lg">⚙️</span>
              <span className="text-[10px] text-neutral-400">أدمن</span>
            </a>
          )}
          <button onClick={logout} className="flex flex-col items-center gap-0.5 px-3 py-1">
            <span className="text-lg">🚪</span>
            <span className="text-[10px] text-neutral-400">خروج</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Menu Component ───
function MobileMenu({ user, activeCategory, searchQuery, setActiveCategory, setSearchQuery, logout }: any) {
  return (
    <div className="p-4">
      {/* Logo */}
      <div className="mb-4 pb-4 border-b border-[#262626]">
        <h1 className="text-2xl font-black text-amber-500">NJADDER</h1>
        <p className="text-xs text-neutral-500 mt-1">PRO v7.0 — 118 أمر</p>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-sm text-white">{user?.username}</p>
            <p className="text-[10px] text-amber-500">{user?.role === "admin" ? "👑 أدمن" : "👤 مستخدم"}</p>
          </div>
          <button onClick={logout} className="text-xs text-neutral-500 hover:text-red-400">خروج</button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 بحث..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg px-3 py-2.5 border border-[#333] focus:border-amber-500/50 focus:outline-none mb-3"
      />

      {/* Categories */}
      <div className="space-y-1">
        <button
          onClick={() => setActiveCategory(null)}
          className={`w-full text-right px-3 py-2.5 rounded-lg text-sm font-medium ${!activeCategory && !searchQuery ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-neutral-400"}`}
        >
          🏠 الرئيسية
        </button>
        {CATEGORIES.sort((a, b) => a.order - b.order).map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`w-full text-right px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between ${activeCategory === cat.key ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-neutral-400"}`}
          >
            <span>{cat.nameAr}</span>
            <span className="text-[10px] text-neutral-600">{getCommandsByCategory(cat.key).length}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
