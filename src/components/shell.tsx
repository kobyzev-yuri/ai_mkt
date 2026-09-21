"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AlertsBell } from "@/components/alerts-bell";
import { deskHome, deskLabel, isDemoPath, isPublicPath, navWorkspaces, pathAllowed } from "@/lib/accounts";
import { isDemoApp } from "@/lib/app-mode";
import { navItemActive } from "@/lib/nav";
import { TIMEWEB_MODELS } from "@/lib/llm-models";
import { useSession } from "@/lib/session";
import { useStore } from "@/lib/store";
import { SUBNAV, WORKSPACES, workspaceFromPath } from "@/lib/workspace";

function SignOutButton({ onLeave }: { onLeave: () => void }) {
  return (
    <button
      type="button"
      onClick={onLeave}
      className="shrink-0 rounded-full border border-line px-3 py-1.5 font-mono text-[11px] text-paper hover:border-brass/50"
    >
      Выйти
    </button>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { account, hydrated, signOut } = useSession();
  const { company, llmModel, setLlmModel } = useStore();
  const [models, setModels] = useState<{ id: string; label: string }[]>(
    TIMEWEB_MODELS.map((m) => ({ id: m.id, label: m.label })),
  );
  const login = pathname.startsWith("/login");
  const demoApp = isDemoApp();
  const demoRun = demoApp || isDemoPath(pathname);
  const desk = account?.desk;
  const ws = workspaceFromPath(pathname, company.role, desk);
  const visible = WORKSPACES.filter((item) => !desk || navWorkspaces(desk).includes(item.id));

  useEffect(() => {
    if (demoApp) return;
    fetch("/api/ollama/models")
      .then((r) => r.json())
      .then((data: { models?: { id: string; label: string }[] }) => {
        if (data.models?.length) setModels(data.models);
      })
      .catch(() => {
        /* keep static list */
      });
  }, [demoApp]);

  useEffect(() => {
    if (demoApp) return;
    if (!hydrated) return;
    if (isPublicPath(pathname)) return;
    if (!account) {
      router.replace("/login");
      return;
    }
    if (!pathAllowed(account.desk, pathname)) {
      router.replace(deskHome(account.desk));
      return;
    }
    if (
      (account.desk === "buy" || account.desk === "sell") &&
      (pathname === "/" || pathname.startsWith("/catalog"))
    ) {
      router.replace(deskHome(account.desk));
    }
  }, [account, demoApp, hydrated, pathname, router]);

  function leave() {
    signOut();
    router.replace("/login");
  }

  if (demoRun) {
    return (
      <>
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5">
            <Link href="/demo" className="leading-none">
              <span className="font-display text-[1.65rem] tracking-wide text-brass-2">Atrium</span>
              <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.28em] text-muted">
                пять процессов
              </span>
            </Link>
            <nav className="flex shrink-0 items-center gap-2">
              <span className="font-mono text-[11px] text-muted">без входа</span>
            </nav>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl justify-between px-5 py-8 text-[12px] text-muted">
            <p>Прогон для жюри. Без кабинетов и без входа.</p>
            <p className="font-mono text-[10px] uppercase tracking-widest">Не финансовая оферта</p>
          </div>
        </footer>
      </>
    );
  }

  if (!account && login) {
    return (
      <>
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
            <Link href="/login" className="leading-none">
              <span className="font-display text-[1.65rem] tracking-wide text-brass-2">Atrium</span>
              <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.28em] text-muted">вход</span>
            </Link>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </>
    );
  }

  if (!account) {
    return <main className="flex flex-1 items-center justify-center text-muted">вход…</main>;
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-5 px-5 py-3.5">
          <Link href={deskHome(account.desk)} className="shrink-0 leading-none">
            <span className="font-display text-[1.65rem] tracking-wide text-brass-2">Atrium</span>
            <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.28em] text-muted">
              {deskLabel(account.desk)}
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {visible.length > 1
              ? visible.map((item) => {
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
                })
              : null}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="font-mono text-[10px] uppercase tracking-widest text-brass">{deskLabel(account.desk)}</p>
              <p className="max-w-[200px] truncate font-mono text-[11px] text-paper">{account.org}</p>
            </div>
            {account.desk === "office" ? (
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
            {account.desk === "buy" || account.desk === "sell" ? <AlertsBell /> : null}
            <SignOutButton onLeave={leave} />
          </div>
        </div>
        {visible.length > 1 ? (
          <nav className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden">
            {visible.map((item) => (
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
        ) : null}
        <nav className="border-t border-line bg-surface/40">
          <div className="mx-auto flex max-w-6xl gap-5 overflow-x-auto px-4 py-2.5">
            {SUBNAV[ws].map((block) => (
              <div key={`${ws}-${block.label || block.items[0]?.href}`} className="shrink-0">
                {block.label ? (
                  <p className="px-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">{block.label}</p>
                ) : null}
                <div className={`flex gap-1 ${block.label ? "mt-1" : ""}`}>
                  {block.items.map((item) => {
                    const active = navItemActive(item, pathname);
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
              </div>
            ))}
          </div>
        </nav>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            {account.desk === "buy"
              ? `${account.org} · закупки. Человек утверждает сделку, аванс, приёмку и остаток.`
              : account.desk === "sell"
                ? `${account.org} · поставки. Человек выкладывает партии, утверждает сделку и может вернуть резерв до аванса.`
                : `${account.org} · бэкофис. Номинал, арбитраж, онбординг. Не сторона сделки.`}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest">Не финансовая оферта</p>
        </div>
      </footer>
    </>
  );
}
