"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AlertsBell } from "@/components/alerts-bell";
import { OLLAMA_MODELS } from "@/lib/ollama";
import { companies } from "@/lib/seed";
import { useStore } from "@/lib/store";
import {
  SUBNAV,
  WORKSPACES,
  companiesForWorkspace,
  companyFitsWorkspace,
  workspaceFromPath,
  type WorkspaceId,
} from "@/lib/workspace";

function subnavActive(href: string, pathname: string, ws: WorkspaceId): boolean {
  if (href === "/" || href === "/buy" || href === "/sell" || href === "/office") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { company, setCompany, hydrated, llmModel, setLlmModel, lastBuyerId, lastSellerId } = useStore();
  const [models, setModels] = useState<{ id: string; label: string }[]>(
    OLLAMA_MODELS.map((m) => ({ id: m.id, label: m.label })),
  );
  const ws = workspaceFromPath(pathname, company.role);
  const roster = companiesForWorkspace(ws);

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

  useEffect(() => {
    if (!hydrated) return;
    if (companyFitsWorkspace(company, ws)) return;
    const next = ws === "buy" ? lastBuyerId : ws === "sell" ? lastSellerId : null;
    if (!next || next === company.id) return;
    setCompany(next);
  }, [ws, company, hydrated, lastBuyerId, lastSellerId, setCompany]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-5 px-5 py-3.5">
          <Link href="/" className="shrink-0 leading-none">
            <span className="font-display text-[1.65rem] tracking-wide text-brass-2">Atrium</span>
            <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.28em] text-muted">
              Agent exchange
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {WORKSPACES.map((item) => {
              const active = ws === item.id;
              return (
                <Link
                  key={item.id}
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
            {hydrated ? <AlertsBell /> : null}
            {hydrated && (
              <div className="hidden items-center gap-2 xl:flex">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-moss" />
                <span className="font-mono text-[11px] text-muted">«{company.agent.name}»</span>
              </div>
            )}
            {ws === "office" || ws === "buy" ? (
              <>
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
              </>
            ) : null}
            <label className="sr-only" htmlFor="company">
              Организация
            </label>
            <select
              id="company"
              value={roster.some((c) => c.id === company.id) ? company.id : roster[0]?.id}
              onChange={(e) => setCompany(e.target.value)}
              className="max-w-[200px] truncate rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[11px] text-paper outline-none"
            >
              {(roster.length ? roster : companies).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.short}
                  {ws === "plaza" || ws === "office"
                    ? ` · ${c.role === "seller" ? "поставщик" : "закупщик"}`
                    : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden">
          {WORKSPACES.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`shrink-0 rounded-full px-3 py-1 text-[12px] ${
                ws === item.id ? "bg-surface-2 text-paper" : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <nav className="border-t border-line bg-surface/40">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
            {SUBNAV[ws].map((item) => {
              const active = subnavActive(item.href, pathname, ws);
              return (
                <Link
                  key={`${ws}-${item.href}`}
                  href={item.href}
                  className={`shrink-0 rounded-full px-3 py-1 text-[12px] ${
                    active ? "text-brass-2" : "text-muted hover:text-paper"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Atrium · закупки, поставки и бэкофис раздельно. Реплики — локальный Ollama; цены и рейтинг — движок.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest">Не финансовая оферта</p>
        </div>
      </footer>
    </>
  );
}
