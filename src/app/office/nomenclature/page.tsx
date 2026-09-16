"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui";
import { mergeListings } from "@/lib/catalog";
import type { CreateSkuInput, DbSnapshot } from "@/lib/db/types";
import { compactRub } from "@/lib/format";
import { SKIP_OWNER_LABEL } from "@/lib/lot-adapter";
import { platformOnboarding } from "@/lib/office-desk";
import { SELLER_ID } from "@/lib/seed";

export default function OfficeNomenclaturePage() {
  const [snap, setSnap] = useState<DbSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [skuBusy, setSkuBusy] = useState<string | null>(null);
  const sellers = useMemo(() => (snap?.companies ?? []).filter((c) => c.role !== "buyer"), [snap]);
  const categories = useMemo(
    () => (snap?.directories ?? []).filter((d) => d.kind === "category").map((d) => d.label),
    [snap],
  );
  const units = useMemo(
    () => (snap?.directories ?? []).filter((d) => d.kind === "unit").map((d) => d.label),
    [snap],
  );
  const packUnits = useMemo(
    () => (snap?.directories ?? []).filter((d) => d.kind === "pack_unit").map((d) => d.label),
    [snap],
  );

  const [form, setForm] = useState<CreateSkuInput>({
    name: "",
    category: "Упаковка",
    unit: "шт",
    moq: 500,
    packSize: 500,
    packUnit: "паллета",
    sellerId: "co-severpak",
    article: "",
  });

  function load() {
    fetch("/api/db")
      .then((r) => r.json())
      .then((data: DbSnapshot & { error?: string }) => {
        if (data.error) {
          setErr(data.error);
          return;
        }
        setSnap(data);
        mergeListings(data.listings);
        setForm((prev) => ({
          ...prev,
          sellerId: prev.sellerId || data.companies.find((c) => c.role === "seller")?.id || "co-severpak",
          category: prev.category || data.directories.find((d) => d.kind === "category")?.label || "Упаковка",
        }));
      })
      .catch(() => setErr("SQLite недоступна"));
  }

  useEffect(() => {
    load();
  }, []);

  async function createCard() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/db/sku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? "не записалось");
        return;
      }
      setForm((prev) => ({ ...prev, name: "", article: "" }));
      load();
    } finally {
      setBusy(false);
    }
  }

  const skipped = platformOnboarding(snap?.listings);

  async function onboard(article: string, name: string, unit: string, packSize: number) {
    setSkuBusy(article);
    setErr(null);
    try {
      const res = await fetch("/api/db/sku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          article,
          sellerId: SELLER_ID,
          category: "Упаковка",
          unit,
          moq: packSize || 500,
          packSize: packSize || 500,
          packUnit: "паллета",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? "не записалось");
        return;
      }
      load();
    } finally {
      setSkuBusy(null);
    }
  }

  const sellerName = (id: string) => snap?.companies.find((c) => c.id === id)?.short ?? id;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Поддержка · номенклатура</p>
      <h1 className="mt-2 font-display text-5xl">Справочник площадки</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
        Каноническая карточка товара площадки. Нестандартный артикул из 1С (нет SKU) заводится здесь и мапится на
        поставщика. Юрлица — в разделе «Участники».
      </p>
      {err ? <p className="mt-4 text-[13px] text-terra">{err}</p> : null}

      <section className="mt-10">
        <h2 className="font-display text-3xl">Очередь онбординга</h2>
        <p className="mt-2 max-w-xl text-[14px] text-muted">
          Выгрузка 1С не знает карточку площадки. Пол цены по-прежнему чинит поставщик.
        </p>
        <div className="mt-5 divide-y divide-line border border-line">
          {skipped.length === 0 ? (
            <p className="bg-surface px-4 py-8 text-[14px] text-muted">Нет строк, которые ждут карточку SKU.</p>
          ) : (
            skipped.map((item) => (
              <div
                key={item.row.code || item.row.sku}
                className="flex flex-col gap-3 bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-display text-xl">{item.row.name || item.row.sku || "строка 1С"}</p>
                  <p className="font-mono text-[11px] text-muted">{item.row.sku}</p>
                  {item.issues
                    .filter((i) => i.owner === "platform")
                    .map((issue) => (
                      <p key={issue.code} className="mt-2 text-[13px] leading-relaxed text-muted">
                        {issue.fact}. {issue.fix}{" "}
                        <span className="font-mono text-[11px] text-brass">{SKIP_OWNER_LABEL[issue.owner]}</span>
                      </p>
                    ))}
                </div>
                {item.row.sku ? (
                  <button
                    type="button"
                    disabled={skuBusy === item.row.sku}
                    onClick={() => void onboard(item.row.sku, item.row.name, item.row.unit, item.row.packSize)}
                    className="shrink-0 rounded-full border border-brass/50 px-4 py-2 text-[12px] text-brass disabled:opacity-40"
                  >
                    Завести SKU
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-10 border border-line bg-surface p-5">
        <h2 className="font-display text-3xl">Завести карточку</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Наименование">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full border border-line bg-bg px-3 py-2 text-[14px] outline-none"
            />
          </Field>
          <Field label="Артикул поставщика">
            <input
              value={form.article}
              onChange={(e) => setForm((f) => ({ ...f, article: e.target.value }))}
              placeholder="SP-XXX"
              className="mt-1 w-full border border-line bg-bg px-3 py-2 font-mono text-[14px] outline-none"
            />
          </Field>
          <Field label="Поставщик">
            <select
              value={form.sellerId}
              onChange={(e) => setForm((f) => ({ ...f, sellerId: e.target.value }))}
              className="mt-1 w-full border border-line bg-bg px-3 py-2 text-[14px] outline-none"
            >
              {sellers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.short}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Категория">
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="mt-1 w-full border border-line bg-bg px-3 py-2 text-[14px] outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Единица">
            <select
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              className="mt-1 w-full border border-line bg-bg px-3 py-2 text-[14px] outline-none"
            >
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Кратность / тара">
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                value={form.packSize}
                onChange={(e) => setForm((f) => ({ ...f, packSize: Number(e.target.value) || 1, moq: Number(e.target.value) || 1 }))}
                className="w-24 border border-line bg-bg px-3 py-2 font-mono text-[14px] outline-none"
              />
              <select
                value={form.packUnit}
                onChange={(e) => setForm((f) => ({ ...f, packUnit: e.target.value }))}
                className="flex-1 border border-line bg-bg px-3 py-2 text-[14px] outline-none"
              >
                {packUnits.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </Field>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void createCard()}
          className="mt-5 rounded-full bg-brass px-5 py-2.5 text-[13px] font-medium text-bg disabled:opacity-40"
        >
          Записать в SQLite
        </button>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl">SKU{snap ? ` · ${snap.skus.length}` : ""}</h2>
        <div className="mt-5 divide-y divide-line border border-line">
          {!snap ? (
            <p className="bg-surface px-4 py-8 text-[14px] text-muted">Читаю data/atrium.sqlite…</p>
          ) : (
            snap.skus.map((sku) => (
              <div key={sku.id} className="bg-surface px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brass">{sku.category}</Badge>
                  <span className="font-mono text-[11px] text-muted">{sku.code}</span>
                </div>
                <p className="mt-2 font-display text-xl">{sku.name}</p>
                <p className="text-[13px] text-muted">
                  {sku.packSize} {sku.packUnit} · {sku.unit}
                </p>
                <ul className="mt-2 space-y-1">
                  {sku.articles.map((a) => (
                    <li key={`${a.sellerId}-${a.article}`} className="font-mono text-[12px] text-muted">
                      {sellerName(a.sellerId)} · {a.article}
                      {a.price ? ` · лист ${compactRub(a.price)}` : ""}
                    </li>
                  ))}
                </ul>
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
