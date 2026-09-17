"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { deskAlerts } from "@/lib/alerts";
import { useStore } from "@/lib/store";

export function AlertsBell() {
  const { company, deals, orders, reputations, policies } = useStore();
  const alerts = deskAlerts(company, deals, orders, reputations, policies);
  const urgent = alerts.filter((a) => a.urgency === "now").length;
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full border border-line px-2.5 py-1.5 text-muted hover:border-brass/50 hover:text-paper"
        aria-label="Уведомления"
        title="Срочное вмешательство"
      >
        <span className="font-mono text-[12px]">🔔</span>
        {urgent > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-[1.1rem] rounded-full bg-terra px-1 text-center font-mono text-[9px] text-bg">
            {urgent}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-[22rem] max-w-[90vw] border border-line bg-bg shadow-lg">
          <p className="border-b border-line px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted">
            Нужен человек
          </p>
          {alerts.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-muted">Срочных вмешательств нет. Агент ведёт комнаты в мандате.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {alerts.map((a) => (
                <li key={a.id}>
                  <Link
                    href={a.href}
                    onClick={() => setOpen(false)}
                    className="block border-b border-line px-4 py-3 hover:bg-surface-2"
                  >
                    <p className="text-[13px] text-paper">{a.title}</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted">{a.detail}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
