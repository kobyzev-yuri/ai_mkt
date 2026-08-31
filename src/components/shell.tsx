"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { OLLAMA_MODELS } from "@/lib/ollama";
import { companies } from "@/lib/seed";
import { useStore } from "@/lib/store";

const NAV = [
  { href: "/", label: "Площадка" },
  { href: "/catalog", label: "Каталог" },
  { href: "/rfq", label: "Запустить агента" },
  { href: "/deals", label: "Сделки" },
  { href: "/orders", label: "Исполнение" },
  { href: "/trust", label: "Доверие" },
  { href: "/companies", label: "Компании" },
  { href: "/dashboard", label: "Кабинет" },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { company, setCompany, hydrated, llmModel, setLlmModel } = useStore();
  const [models, setModels] = useState<{ id: string; label: string }[]>(
    OLLAMA_MODELS.map((m) => ({ id: m.id, label: m.label })),
  );

  useEffect(() => {
    fetch("/api/ollama/models")
      .then((r) => r.json())
      .then((data: { models?: { id: string; label: string }[] }) => {
        if (data.models?.length) setModels(data.models);
      })
      .catch(() => {
        /* keep static list */
      });
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3.5">
          <Link href="/" className="shrink-0 leading-none">
            <span className="font-display text-[1.65rem] tracking-wide text-brass-2">Atrium</span>
            <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.28em] text-muted">
              Agent exchange
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-1.5 text-[13px] transition ${
                    active ? "bg-surface-2 text-paper" : "text-muted hover:text-paper"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {hydrated && (
              <div className="hidden items-center gap-2 xl:flex">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-moss" />
                <span className="font-mono text-[11px] text-muted">«{company.agent.name}»</span>
              </div>
            )}
            <label className="sr-only" htmlFor="model">
              Модель
            </label>
            <select
              id="model"
              value={llmModel}
              onChange={(e) => setLlmModel(e.target.value)}
              className="max-w-[140px] truncate rounded-full border border-line bg-surface px-2.5 py-1.5 font-mono text-[10px] text-paper outline-none"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="company">
              Компания
            </label>
            <select
              id="company"
              value={company.id}
              onChange={(e) => setCompany(e.target.value)}
              className="max-w-[180px] truncate rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[11px] text-paper outline-none"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.short} · {c.role === "seller" ? "поставщик" : "закупщик"}
                </option>
              ))}
            </select>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full px-3 py-1 text-[12px] text-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Atrium · партии, мандат, инциденты. Реплики пишет локальный Ollama; цены, SLA и рейтинг — движок.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest">Не финансовая оферта</p>
        </div>
      </footer>
    </>
  );
}
