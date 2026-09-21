"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui";
import { mergeAccounts } from "@/lib/accounts";
import type { CreateCompanyInput, DbSnapshot } from "@/lib/db/types";
import { mergeCompanies } from "@/lib/roster";
import { companyMatchesQuery } from "@/lib/search";

export default function OfficeSupportPage() {
  const [snap, setSnap] = useState<DbSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<CreateCompanyInput>({
    name: "",
    short: "",
    city: "",
    inn: "",
    industry: "",
    role: "buyer",
    person: "",
    pin: "",
  });
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "buyer" | "seller">("all");

  function load() {
    fetch("/api/db")
      .then((r) => r.json())
      .then((data: DbSnapshot & { error?: string }) => {
        if (data.error) {
          setErr(data.error);
          return;
        }
        setSnap(data);
        mergeCompanies(data.companies);
        mergeAccounts(data.accounts);
      })
      .catch(() => setErr("SQLite недоступна"));
  }

  useEffect(() => {
    load();
  }, []);

  async function register() {
    setBusy(true);
    setErr(null);
    setCreatedPin(null);
    try {
      const res = await fetch("/api/db/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string; account?: { pin: string } };
      if (!res.ok) {
        setErr(data.error ?? "не записалось");
        return;
      }
      setCreatedPin(data.account?.pin ?? null);
      setForm({
        name: "",
        short: "",
        city: "",
        inn: "",
        industry: "",
        role: form.role,
        person: "",
        pin: "",
      });
      load();
    } finally {
      setBusy(false);
    }
  }

  const orgs = useMemo(() => {
    const rows = snap?.companies ?? [];
    return rows.filter((c) => {
      if (roleFilter === "buyer" && c.role === "seller") return false;
      if (roleFilter === "seller" && c.role === "buyer") return false;
      return companyMatchesQuery(c, q);
    });
  }, [snap, q, roleFilter]);
  const pinOf = (companyId: string) => snap?.accounts.find((a) => a.companyId === companyId)?.pin;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Поддержка · участники</p>
      <h1 className="mt-2 font-display text-5xl">Завести в контур</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
        Здесь площадка регистрирует юридическое лицо и выдаёт кабинет. Нестандартный артикул 1С сюда не относится —
        это карточка SKU в номенклатуре.
      </p>
      {err ? <p className="mt-4 text-[13px] text-terra">{err}</p> : null}
      {createdPin ? (
        <p className="mt-4 font-mono text-[13px] text-brass">Кабинет записан. Пароль на входе: {createdPin}</p>
      ) : null}

      <section className="mt-10 border border-line bg-surface p-5">
        <h2 className="font-display text-3xl">Новый участник</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Организация">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full border border-line bg-bg px-3 py-2 text-[14px] outline-none"
            />
          </Field>
          <Field label="Кратко">
            <input
              value={form.short ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, short: e.target.value }))}
              className="mt-1 w-full border border-line bg-bg px-3 py-2 text-[14px] outline-none"
            />
          </Field>
          <Field label="ИНН">
            <input
              value={form.inn}
              onChange={(e) => setForm((f) => ({ ...f, inn: e.target.value }))}
              className="mt-1 w-full border border-line bg-bg px-3 py-2 font-mono text-[14px] outline-none"
            />
          </Field>
          <Field label="Город">
            <input
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className="mt-1 w-full border border-line bg-bg px-3 py-2 text-[14px] outline-none"
            />
          </Field>
          <Field label="Роль">
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value === "seller" ? "seller" : "buyer" }))}
              className="mt-1 w-full border border-line bg-bg px-3 py-2 text-[14px] outline-none"
            >
              <option value="buyer">закупщик</option>
              <option value="seller">поставщик</option>
            </select>
          </Field>
          <Field label="Контакт / агент">
            <input
              value={form.person ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, person: e.target.value }))}
              placeholder="Закуп"
              className="mt-1 w-full border border-line bg-bg px-3 py-2 text-[14px] outline-none"
            />
          </Field>
          <Field label="Отрасль">
            <input
              value={form.industry ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              className="mt-1 w-full border border-line bg-bg px-3 py-2 text-[14px] outline-none"
            />
          </Field>
          <Field label="Пароль кабинета (4 цифры)">
            <input
              value={form.pin ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))}
              placeholder="авто"
              className="mt-1 w-full border border-line bg-bg px-3 py-2 font-mono text-[14px] outline-none"
            />
          </Field>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void register()}
          className="mt-5 rounded-full bg-brass px-5 py-2.5 text-[13px] font-medium text-bg disabled:opacity-40"
        >
          Записать в контур
        </button>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl">Реестр{orgs.length ? ` · ${orgs.length}` : ""}</h2>
        <div className="mt-5 divide-y divide-line border border-line">
          {orgs.length === 0 ? (
            <p className="bg-surface px-4 py-8 text-[14px] text-muted">Читаю roster из SQLite…</p>
          ) : (
            orgs.map((c) => (
              <div key={c.id} className="flex flex-col gap-1 bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={c.role === "seller" ? "brass" : "default"}>
                      {c.role === "seller" ? "поставщик" : "закупщик"}
                    </Badge>
                    {pinOf(c.id) ? (
                      <span className="font-mono text-[11px] text-brass">вход {pinOf(c.id)}</span>
                    ) : (
                      <span className="font-mono text-[11px] text-terra">нет логина</span>
                    )}
                  </div>
                  <p className="mt-2 font-display text-xl">{c.name}</p>
                  <p className="text-[13px] text-muted">
                    {c.city} · ИНН {c.inn} · агент «{c.agent.name}»
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</span>
      {children}
    </label>
  );
}
