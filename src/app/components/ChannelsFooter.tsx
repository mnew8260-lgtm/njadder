"use client";

import { CHANNELS } from "@/lib/config";

/**
 * Official channels & support footer.
 * Used on /login, /register, /pending to promote dev channels
 * and give users quick access to support.
 */
export function ChannelsFooter({ title = "📡 القنوات الرسمية والدعم" }: { title?: string }) {
  return (
    <div className="mt-6 bg-[#141414] border border-[#262626] rounded-2xl p-4 text-center">
      <p className="text-xs text-neutral-500 mb-3">{title}</p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {CHANNELS.map((ch) => (
          <a
            key={ch.handle}
            href={ch.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${
              ch.type === "support"
                ? "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
                : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400"
            }`}
          >
            {ch.icon} {ch.label}
          </a>
        ))}
      </div>
    </div>
  );
}
