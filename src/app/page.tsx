"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, COMMANDS, getCommandsByCategory, Command } from "@/lib/commands";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [executing, setExecuting] = useState(false);
  const [output, setOutput] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  // ─── Login flow state (for cmd "login") ───
  const [loginStep, setLoginStep] = useState<"form" | "code" | "2fa" | "done">("form");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginSession, setLoginSession] = useState("");
  const [loginHash, setLoginHash] = useState("");
  const [loginApiId, setLoginApiId] = useState("");
  const [loginApiHash, setLoginApiHash] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.ok) { router.push("/login"); return; }
      setUser(d.user);
      // التحقق من حالة الموافقة (الأدمن يتخطّى)
      if (d.user.role !== "admin" && d.user.status === "pending") { router.push("/pending"); return; }
      if (d.user.role !== "admin" && d.user.status === "rejected") { router.push("/pending"); return; }
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

  const searchResults = searchQuery
    ? COMMANDS.filter(c =>
        c.nameAr.includes(searchQuery) ||
        c.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.key.includes(searchQuery)
      )
    : [];

  async function executeCommand() {
    if (!selectedCommand || !selectedAccount) return;
    setExecuting(true);
    setOutput("⏳ جاري التنفيذ...");
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccount, commandKey: selectedCommand.key, params: formValues }),
      });
      const data = await res.json();
      setOutput(data.output || data.error || "تم");
    } catch (e: any) { setOutput("❌ " + e.message); }
    setExecuting(false);
  }

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" }).catch(() => {});
    document.cookie = "njadder_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  }

  // ─── Login flow: send code → verify → 2FA ───
  async function doLoginSendCode() {
    if (!loginPhone) { setOutput("❌ أدخل رقم الهاتف"); return; }
    setExecuting(true); setOutput("⏳ جاري إرسال الكود...");
    try {
      const res = await fetch("/api/accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_code", phone: loginPhone, apiId: loginApiId || undefined, apiHash: loginApiHash || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        setLoginSession(data.sessionString);
        setLoginHash(data.phoneCodeHash);
        setLoginStep("code");
        setOutput("✅ تم إرسال الكود إلى تيليجرام. أدخل الكود بالأسفل.");
      } else { setOutput("❌ " + (data.error || "فشل")); }
    } catch (e: any) { setOutput("❌ " + e.message); }
    setExecuting(false);
  }

  async function doLoginVerifyCode() {
    if (!loginCode) { setOutput("❌ أدخل الكود"); return; }
    setExecuting(true); setOutput("⏳ جاري التحقق...");
    try {
      const res = await fetch("/api/accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_code", phone: loginPhone, code: loginCode, sessionString: loginSession, phoneCodeHash: loginHash, apiId: loginApiId || undefined, apiHash: loginApiHash || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        setLoginStep("done");
        setOutput("✅ تمت إضافة الحساب بنجاح!");
        loadAccounts();
      } else if (data.need2FA) {
        setLoginStep("2fa");
        setOutput("🔐 هذا الحساب مفعّل عليه 2FA. أدخل كلمة المرور بالأسفل.");
      } else { setOutput("❌ " + (data.error || "فشل")); }
    } catch (e: any) { setOutput("❌ " + e.message); }
    setExecuting(false);
  }

  async function doLoginVerify2FA() {
    if (!loginPassword) { setOutput("❌ أدخل كلمة المرور"); return; }
    setExecuting(true); setOutput("⏳ جاري التحقق...");
    try {
      const res = await fetch("/api/accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_2fa", phone: loginPhone, password: loginPassword, sessionString: loginSession, apiId: loginApiId || undefined, apiHash: loginApiHash || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        setLoginStep("done");
        setOutput("✅ تمت إضافة الحساب بنجاح!");
        loadAccounts();
      } else { setOutput("❌ " + (data.error || "فشل")); }
    } catch (e: any) { setOutput("❌ " + e.message); }
    setExecuting(false);
  }

  function resetLoginFlow() {
    setLoginStep("form");
    setLoginPhone(""); setLoginCode(""); setLoginPassword("");
    setLoginSession(""); setLoginHash("");
    setOutput("");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">⏳</div>;

  const sortedCats = [...CATEGORIES].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen pb-20 md:pb-6">
      {/* ─── Top Bar ─── */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#1a1a1a] safe-top">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <h1 className="text-xl font-black text-amber-500 shrink-0">NJADDER</h1>
          <input
            type="text"
            placeholder="🔍 بحث..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setExpandedCat(null); setSelectedCommand(null); setOutput(""); }}
            className="flex-1 max-w-xs bg-[#141414] text-white text-sm rounded-full px-4 py-2 border border-[#222] focus:border-amber-500/30 focus:outline-none"
          />
          <div className="flex items-center gap-2 shrink-0">
            <a href="/accounts" className="text-sm text-neutral-400 hover:text-amber-500">📱</a>
            <a href="/blacklist" className="text-sm text-neutral-400 hover:text-amber-500">🚫</a>
            <a href="/subscription" className="text-sm text-neutral-400 hover:text-amber-500">💳</a>
            {user?.role === "admin" && <a href="/admin" className="text-sm text-neutral-400 hover:text-amber-500">⚙️</a>}
            <button onClick={logout} className="text-sm text-neutral-500 hover:text-red-400">🚪</button>
          </div>
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* ─── Search Results ─── */}
        {searchQuery && !selectedCommand && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4">🔍 نتائج البحث ({searchResults.length})</h2>
            <div className="space-y-2">
              {searchResults.map(cmd => (
                <CommandRow key={cmd.id} cmd={cmd} onClick={() => { setSelectedCommand(cmd); setFormValues({}); setOutput(""); }} />
              ))}
            </div>
          </div>
        )}

        {/* ─── Tiered Categories (Accordion) ─── */}
        {!searchQuery && !selectedCommand && (
          <div className="space-y-3">
            {sortedCats.map(cat => {
              const cmds = getCommandsByCategory(cat.key);
              const isExpanded = expandedCat === cat.key;
              return (
                <div key={cat.key} className="bg-[#141414] border border-[#1a1a1a] rounded-2xl overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => setExpandedCat(isExpanded ? null : cat.key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black" style={{ color: cat.accent }}>{cat.range.split("-")[0]}</span>
                      <div className="text-right">
                        <h3 className="font-bold text-white text-sm">{cat.nameAr}</h3>
                        <p className="text-[10px] text-neutral-500">{cat.nameEn} · {cat.range}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">{cmds.length}</span>
                      <span className={`text-neutral-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                    </div>
                  </button>

                  {/* Commands (expandable) */}
                  {isExpanded && (
                    <div className="border-t border-[#1a1a1a] divide-y divide-[#1a1a1a]">
                      {cmds.map(cmd => (
                        <CommandRow key={cmd.id} cmd={cmd} onClick={() => { setSelectedCommand(cmd); setFormValues({}); setOutput(""); }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Command Execution ─── */}
        {selectedCommand && (
          <div className="max-w-2xl mx-auto">
            <button onClick={() => { setSelectedCommand(null); setOutput(""); resetLoginFlow(); }}
              className="text-sm text-neutral-500 hover:text-amber-500 mb-4">← رجوع</button>

            <div className="bg-[#141414] border border-[#1a1a1a] rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-neutral-600 bg-[#0a0a0a] px-1.5 py-0.5 rounded">{selectedCommand.id}</span>
                {selectedCommand.risk === "high" && <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">⚠️ خطر</span>}
              </div>
              <h2 className="text-xl font-black text-white">{selectedCommand.nameAr}</h2>
              <p className="text-sm text-neutral-500 mt-1">{selectedCommand.description}</p>
            </div>

            {/* ─── Special: Login flow (cmd.key === "login") ─── */}
            {selectedCommand.key === "login" ? (
              <>
                {/* Step 1: Phone */}
                {loginStep === "form" && (
                  <div className="bg-[#141414] border border-[#1a1a1a] rounded-2xl p-4 mb-4 space-y-3">
                    <div>
                      <label className="block text-sm text-neutral-300 mb-1">📱 رقم الهاتف *</label>
                      <input type="tel" className="w-full bg-[#0a0a0a] text-white text-base rounded-lg px-3 py-3 border border-[#222] focus:border-amber-500/30 focus:outline-none"
                        placeholder="+9665XXXXXXXX" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} dir="ltr" autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-neutral-300 mb-1">API ID (اختياري)</label>
                        <input type="text" className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2 border border-[#222] focus:border-amber-500/30 focus:outline-none"
                          placeholder="افتراضي" value={loginApiId} onChange={e => setLoginApiId(e.target.value)} dir="ltr" />
                      </div>
                      <div>
                        <label className="block text-sm text-neutral-300 mb-1">API Hash (اختياري)</label>
                        <input type="text" className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2 border border-[#222] focus:border-amber-500/30 focus:outline-none"
                          placeholder="افتراضي" value={loginApiHash} onChange={e => setLoginApiHash(e.target.value)} dir="ltr" />
                      </div>
                    </div>
                    <button onClick={doLoginSendCode} disabled={executing || !loginPhone}
                      className="w-full bg-amber-500 text-black font-bold rounded-xl py-3 hover:bg-amber-400 transition-colors disabled:opacity-50 active:scale-[0.98]">
                      {executing ? "⏳ جاري الإرسال..." : "📨 إرسال الكود"}
                    </button>
                  </div>
                )}

                {/* Step 2: Code */}
                {loginStep === "code" && (
                  <div className="bg-[#141414] border border-[#1a1a1a] rounded-2xl p-4 mb-4 space-y-3">
                    <div className="text-center text-sm text-amber-500">✅ تم إرسال الكود إلى {loginPhone}</div>
                    <div>
                      <label className="block text-sm text-neutral-300 mb-1">📩 الكود</label>
                      <input type="text" className="w-full bg-[#0a0a0a] text-white text-center text-2xl tracking-widest font-mono rounded-lg px-3 py-4 border border-[#222] focus:border-amber-500/30 focus:outline-none"
                        placeholder="12345" maxLength={6} value={loginCode} onChange={e => setLoginCode(e.target.value.replace(/\D/g, ""))} dir="ltr" autoFocus
                        onKeyDown={e => e.key === "Enter" && doLoginVerifyCode()} />
                    </div>
                    <button onClick={doLoginVerifyCode} disabled={executing || !loginCode}
                      className="w-full bg-amber-500 text-black font-bold rounded-xl py-3 hover:bg-amber-400 transition-colors disabled:opacity-50 active:scale-[0.98]">
                      {executing ? "⏳ جاري التحقق..." : "✓ تحقق"}
                    </button>
                  </div>
                )}

                {/* Step 3: 2FA */}
                {loginStep === "2fa" && (
                  <div className="bg-[#141414] border border-[#1a1a1a] rounded-2xl p-4 mb-4 space-y-3">
                    <div className="text-center text-sm text-amber-500">🔐 التحقق بخطوتين (2FA)</div>
                    <div>
                      <label className="block text-sm text-neutral-300 mb-1">🔑 كلمة مرور 2FA</label>
                      <input type="password" className="w-full bg-[#0a0a0a] text-white text-base rounded-lg px-3 py-3 border border-[#222] focus:border-amber-500/30 focus:outline-none"
                        placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} dir="ltr" autoFocus
                        onKeyDown={e => e.key === "Enter" && doLoginVerify2FA()} />
                    </div>
                    <button onClick={doLoginVerify2FA} disabled={executing || !loginPassword}
                      className="w-full bg-amber-500 text-black font-bold rounded-xl py-3 hover:bg-amber-400 transition-colors disabled:opacity-50 active:scale-[0.98]">
                      {executing ? "⏳ جاري التحقق..." : "✓ تحقق"}
                    </button>
                  </div>
                )}

                {/* Step 4: Done */}
                {loginStep === "done" && (
                  <div className="bg-[#141414] border border-[#1a1a1a] rounded-2xl p-6 mb-4 text-center">
                    <div className="text-4xl mb-3">✅</div>
                    <p className="text-lg font-bold text-white mb-2">تمت إضافة الحساب بنجاح!</p>
                    <button onClick={() => { setSelectedCommand(null); resetLoginFlow(); }}
                      className="mt-3 text-sm text-amber-500 hover:underline">← العودة للأوامر</button>
                  </div>
                )}

                {output && (
                  <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4">
                    <pre className="text-sm text-neutral-300 whitespace-pre-wrap font-mono" dir="ltr">{output}</pre>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* ─── Normal command execution ─── */}
                {/* Account */}
                <div className="bg-[#141414] border border-[#1a1a1a] rounded-2xl p-4 mb-4">
                  <label className="block text-sm text-neutral-400 mb-2">📱 الحساب</label>
                  {accounts.length === 0 ? (
                    <a href="/accounts" className="text-sm text-amber-500 hover:underline">لا يوجد حسابات — أضف حساباً ←</a>
                  ) : (
                    <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}
                      className="w-full bg-[#0a0a0a] text-white rounded-lg px-3 py-2.5 border border-[#222] focus:border-amber-500/30 focus:outline-none">
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.full_name || a.phone}</option>)}
                    </select>
                  )}
                </div>

                {/* Fields */}
                {selectedCommand.fields.length > 0 && (
                  <div className="bg-[#141414] border border-[#1a1a1a] rounded-2xl p-4 mb-4 space-y-3">
                    {selectedCommand.fields.map(field => (
                      <div key={field.name}>
                        <label className="block text-sm text-neutral-300 mb-1">
                          {field.label}{field.required && <span className="text-red-400 mr-1">*</span>}
                        </label>
                        {field.type === "textarea" ? (
                          <>
                            <textarea className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2 border border-[#222] focus:border-amber-500/30 focus:outline-none"
                              placeholder={field.placeholder} dir="ltr" rows={4}
                              value={formValues[field.name] || ""}
                              onChange={e => setFormValues({ ...formValues, [field.name]: e.target.value })}
                            />
                            <label className="mt-2 flex items-center justify-center gap-2 w-full bg-[#1a1a1a] text-neutral-400 text-xs rounded-lg py-2 border border-[#222] hover:border-amber-500/30 hover:text-amber-500 transition-colors cursor-pointer">
                              📎 تحميل ملف CSV/TXT
                              <input type="file" accept=".csv,.txt" className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => setFormValues({ ...formValues, [field.name]: (ev.target?.result as string).trim() }); r.readAsText(f); }}
                              />
                            </label>
                            {formValues[field.name] && <p className="text-[10px] text-green-400 mt-1">✓ {formValues[field.name].split("\n").filter(l => l.trim()).length} سطر</p>}
                          </>
                        ) : (
                          <input type={field.type === "number" ? "number" : field.type === "tel" ? "tel" : "text"}
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

                <button onClick={executeCommand} disabled={executing || !selectedAccount}
                  className="w-full bg-amber-500 text-black font-bold rounded-xl py-3 hover:bg-amber-400 transition-colors disabled:opacity-50 active:scale-[0.98] mb-4">
                  {executing ? "⏳ جاري التنفيذ..." : "⚡ تنفيذ الأمر"}
                </button>

                {output && (
                  <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4">
                    <h3 className="text-sm font-bold text-amber-500 mb-2">📤 النتيجة</h3>
                    <pre className="text-sm text-neutral-300 whitespace-pre-wrap font-mono" dir="ltr">{output}</pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-[#1a1a1a] safe-bottom">
        <div className="flex items-center justify-around py-2">
          <button onClick={() => { setExpandedCat(null); setSearchQuery(""); setSelectedCommand(null); setOutput(""); }} className="flex flex-col items-center gap-0.5 px-2 py-1">
            <span className="text-lg">🏠</span><span className="text-[10px] text-neutral-400">الرئيسية</span>
          </button>
          <a href="/accounts" className="flex flex-col items-center gap-0.5 px-2 py-1"><span className="text-lg">📱</span><span className="text-[10px] text-neutral-400">حسابات</span></a>
          <a href="/blacklist" className="flex flex-col items-center gap-0.5 px-2 py-1"><span className="text-lg">🚫</span><span className="text-[10px] text-neutral-400">سوداء</span></a>
          <a href="/subscription" className="flex flex-col items-center gap-0.5 px-2 py-1"><span className="text-lg">💳</span><span className="text-[10px] text-neutral-400">اشتراك</span></a>
          <button onClick={logout} className="flex flex-col items-center gap-0.5 px-2 py-1"><span className="text-lg">🚪</span><span className="text-[10px] text-neutral-400">خروج</span></button>
        </div>
      </div>
    </div>
  );
}

// ─── Command Row Component (reused in search + accordion) ───
function CommandRow({ cmd, onClick }: { cmd: Command; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center justify-between p-3 hover:bg-[#1a1a1a] transition-colors text-right group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-[10px] font-mono text-neutral-600 bg-[#0a0a0a] px-1.5 py-0.5 rounded shrink-0">{cmd.id}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white group-hover:text-amber-500 truncate">{cmd.nameAr}</p>
          <p className="text-[10px] text-neutral-600 truncate">{cmd.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {cmd.risk === "high" && <span className="text-[10px] text-red-400">⚠️</span>}
        {cmd.risk === "medium" && <span className="text-[10px] text-yellow-400">⚡</span>}
        <span className="text-neutral-600 text-xs">←</span>
      </div>
    </button>
  );
}
