"use client";

import { tickerEvents } from "@/lib/seed";

export function Ticker() {
  const loop = [...tickerEvents, ...tickerEvents];
  return (
    <div className="overflow-hidden border-y border-line bg-surface">
      <div className="animate-ticker flex w-max gap-10 py-2.5">
        {loop.map((e, i) => (
          <span key={`${e.id}-${i}`} className="flex items-center gap-3 whitespace-nowrap font-mono text-[11px]">
            <span
              className={
                e.tone === "deal" ? "text-moss" : e.tone === "rfq" ? "text-brass" : "text-muted"
              }
            >
              ●
            </span>
            <span className="text-paper/80">{e.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
