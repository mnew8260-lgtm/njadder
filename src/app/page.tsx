"use client";

import { useState } from "react";
import { CATEGORIES, COMMANDS, getCommandsByCategory, Command } from "@/lib/commands";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);

  const filteredCommands = searchQuery
    ? COMMANDS.filter(c =>
        c.nameAr.includes(searchQuery) ||
        c.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.key.includes(searchQuery)
      )
    : activeCategory
      ? getCommandsByCategory(activeCategory)
      : [];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f0f0f] border-l border-[#262626] flex flex-col fixed h-full overflow-y-auto">
        {/* Logo */}
        <div className="p-5 border-b border-[#262626]">
          <h1 className="text-2xl font-black text-amber-500 tracking-tight">NJADDER</h1>
          <p className="text-xs text-neutral-500 mt-1">PRO v7.0 — 118 أمر</p>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#262626]">
          <input
            type="text"
            placeholder="🔍 بحث..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setActiveCategory(null); }}
            className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg px-3 py-2 border border-[#333] focus:border-amber-500/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Categories */}
        <nav className="flex-1 p-2 space-y-1">
          <button
            onClick={() => { setActiveCategory(null); setSearchQuery(""); }}
            className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              !activeCategory && !searchQuery
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "text-neutral-400 hover:bg-[#1a1a1a] hover:text-white"
            }`}
          >
            🏠 الرئيسية
          </button>

          {CATEGORIES.sort((a, b) => a.order - b.order).map(cat => (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setSearchQuery(""); }}
              className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${
                activeCategory === cat.key
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "text-neutral-400 hover:bg-[#1a1a1a] hover:text-white"
              }`}
            >
              <span>{cat.nameAr}</span>
              <span className="text-[10px] text-neutral-600">{getCommandsByCategory(cat.key).length}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[#262626] text-center">
          <p className="text-[10px] text-neutral-600">@NMDDER_DEV</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 mr-64 p-6 overflow-y-auto">
        {/* Header */}
        <header className="mb-6">
          <h2 className="text-3xl font-black text-white">
            {searchQuery
              ? `🔍 نتائج البحث (${filteredCommands.length})`
              : activeCategory
                ? CATEGORIES.find(c => c.key === activeCategory)?.nameAr
                : "🏆 لوحة التحكم"}
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            {searchQuery
              ? `بحث عن: "${searchQuery}"`
              : activeCategory
                ? CATEGORIES.find(c => c.key === activeCategory)?.nameEn
                : "118 أمر في 14 فئة — جاهز للاستخدام"}
          </p>
        </header>

        {/* Dashboard */}
        {!activeCategory && !searchQuery && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {CATEGORIES.sort((a, b) => a.order - b.order).map(cat => {
              const count = getCommandsByCategory(cat.key).length;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className="group bg-[#141414] border border-[#262626] rounded-xl p-5 hover:border-amber-500/30 hover:bg-[#1a1a1a] transition-all text-right"
                >
                  <div className="text-3xl mb-2" style={{ color: cat.accent }}>
                    {cat.range.split("-")[0]}
                  </div>
                  <h3 className="font-bold text-white text-sm mb-1 group-hover:text-amber-400 transition-colors">
                    {cat.nameAr}
                  </h3>
                  <p className="text-xs text-neutral-500">{cat.nameEn}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-amber-500/70 font-mono">{cat.range}</span>
                    <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">
                      {count} أمر
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Commands Grid */}
        {(activeCategory || searchQuery) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCommands.map(cmd => (
              <button
                key={cmd.id}
                onClick={() => setSelectedCommand(cmd)}
                className="group bg-[#141414] border border-[#262626] rounded-xl p-4 hover:border-amber-500/30 hover:bg-[#1a1a1a] transition-all text-right"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-neutral-600 bg-[#1a1a1a] px-1.5 py-0.5 rounded">
                      {cmd.id}
                    </span>
                    {cmd.risk === "high" && (
                      <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                        ⚠️ خطر
                      </span>
                    )}
                    {cmd.risk === "medium" && (
                      <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                        ⚡ متوسط
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="font-bold text-white text-sm mb-1 group-hover:text-amber-400 transition-colors">
                  {cmd.nameAr}
                </h3>
                <p className="text-xs text-neutral-500 mb-2">{cmd.nameEn}</p>
                <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
                  {cmd.description}
                </p>
                {cmd.fields.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cmd.fields.slice(0, 3).map(f => (
                      <span key={f.name} className="text-[10px] text-neutral-500 bg-[#0a0a0a] px-1.5 py-0.5 rounded">
                        {f.label}
                      </span>
                    ))}
                    {cmd.fields.length > 3 && (
                      <span className="text-[10px] text-neutral-600">+{cmd.fields.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Command Dialog */}
        {selectedCommand && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedCommand(null)}
          >
            <div
              className="bg-[#141414] border border-[#333] rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Dialog Header */}
              <div className="p-5 border-b border-[#262626]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedCommand.nameAr}</h3>
                    <p className="text-sm text-neutral-500">{selectedCommand.nameEn}</p>
                  </div>
                  <button
                    onClick={() => setSelectedCommand(null)}
                    className="text-neutral-500 hover:text-white text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>
                <p className="text-xs text-neutral-400 mt-2">{selectedCommand.description}</p>
              </div>

              {/* Dialog Body */}
              <div className="p-5 space-y-4">
                {selectedCommand.fields.map(field => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-400 mr-1">*</span>}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2 border border-[#333] focus:border-amber-500/50 focus:outline-none"
                        placeholder={field.placeholder}
                        dir="ltr"
                        rows={4}
                      />
                    ) : field.type === "select" ? (
                      <select className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2 border border-[#333] focus:border-amber-500/50 focus:outline-none">
                        {field.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : field.type === "tel" ? "tel" : "text"}
                        className="w-full bg-[#0a0a0a] text-white text-sm rounded-lg px-3 py-2 border border-[#333] focus:border-amber-500/50 focus:outline-none"
                        placeholder={field.placeholder}
                        defaultValue={field.default ?? ""}
                        dir={field.type === "tel" || field.type === "url" ? "ltr" : "rtl"}
                      />
                    )}
                    {field.helper && (
                      <p className="text-[10px] text-neutral-600 mt-1">{field.helper}</p>
                    )}
                  </div>
                ))}

                {selectedCommand.fields.length === 0 && (
                  <p className="text-sm text-neutral-500 text-center py-4">
                    لا توجد حقول إدخال لهذا الأمر
                  </p>
                )}
              </div>

              {/* Dialog Footer */}
              <div className="p-5 border-t border-[#262626] flex gap-3">
                <button
                  onClick={() => setSelectedCommand(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold bg-[#262626] text-neutral-300 hover:bg-[#333] transition-colors"
                >
                  إلغاء
                </button>
                <button
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold bg-amber-500 text-black hover:bg-amber-400 transition-colors"
                >
                  ⚡ تنفيذ
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
