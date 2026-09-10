"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui";
import { freeQty } from "@/lib/inventory";
import { days, incotermLabel, num, rub } from "@/lib/format";
import { packingOf } from "@/lib/packing";
import { CATEGORIES, companies, products } from "@/lib/seed";
import { useStore } from "@/lib/store";

export default function CatalogPage() {
  const { lots } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [view, setView] = useState<"sku" | "lots">("lots");
  const [ready, setReady] = useState(false);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!n) return true;
      return `${p.name} ${p.sku} ${p.tags.join(" ")} ${p.description}`.toLowerCase().includes(n);
    });
  }, [q, cat]);

  const lotList = useMemo(() => {
    const n = q.trim().toLowerCase();
    return lots.filter((lot) => {
      const product = products.find((p) => p.id === lot.productId);
      if (!product) return false;
      if (cat !== "all" && product.category !== cat) return false;
      if (ready && lot.readyDays > 0) return false;
      if (freeQty(lot) < lot.packSize) return false;
      if (!n) return true;
      return `${product.name} ${lot.batchNo} ${lot.warehouse} ${lot.city}`.toLowerCase().includes(n);
    });
  }, [q, cat, lots, ready]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Каталог партий</p>
      <h1 className="mt-2 font-display text-5xl">Свободные лоты</h1>
      <p className="mt-3 max-w-xl text-muted">
        B2B торгует не штуками с витрины, а партиями: паллета, связка, бочка, слот производства. Поиск агента видит
        только свободный остаток: резерв под оплату/отгрузку прячет позицию, списание после закрытия убирает её,
        срыв до оплаты возвращает.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Партия, SKU, склад, Казань…"
          className="flex-1 border border-line bg-surface px-4 py-2.5 text-[14px] outline-none placeholder:text-muted focus:border-brass/50"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("lots")}
            className={`rounded-full border px-3 py-1.5 text-[12px] ${view === "lots" ? "border-brass text-brass-2" : "border-line text-muted"}`}
          >
            Партии
          </button>
          <button
            type="button"
            onClick={() => setView("sku")}
            className={`rounded-full border px-3 py-1.5 text-[12px] ${view === "sku" ? "border-brass text-brass-2" : "border-line text-muted"}`}
          >
            Позиции
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCat("all")}
          className={`rounded-full border px-3 py-1 text-[12px] ${cat === "all" ? "border-brass text-brass-2" : "border-line text-muted"}`}
        >
          Все
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`rounded-full border px-3 py-1 text-[12px] ${cat === c ? "border-brass text-brass-2" : "border-line text-muted"}`}
          >
            {c}
          </button>
        ))}
        {view === "lots" && (
          <button
            type="button"
            onClick={() => setReady((v) => !v)}
            className={`rounded-full border px-3 py-1 text-[12px] ${ready ? "border-brass text-brass-2" : "border-line text-muted"}`}
          >
            Только с наличия
          </button>
        )}
      </div>

      {view === "sku" ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="mt-8 divide-y divide-line border border-line">
          {lotList.map((lot) => {
            const product = products.find((p) => p.id === lot.productId)!;
            const seller = companies.find((c) => c.id === lot.sellerId);
            const free = freeQty(lot);
            const packs = Math.floor(free / lot.packSize);
            return (
              <Link
                key={lot.id}
                href={`/catalog/${product.id}`}
                className="flex flex-col gap-2 bg-surface px-4 py-4 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{product.category}</Badge>
                    <span className="font-mono text-[11px] text-brass">{lot.batchNo}</span>
                    {lot.readyDays === 0 ? <Badge tone="moss">с наличия</Badge> : <Badge>через {days(lot.readyDays)}</Badge>}
                  </div>
                  <p className="mt-2 font-display text-xl">{product.name}</p>
                  <p className="text-[13px] text-muted">
                    {lot.warehouse} · {seller?.short} · {incotermLabel(lot.incoterm)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-mono text-[13px] text-brass">
                    {num(free)} {lot.unit} · {num(packs)} {lot.packUnit}
                  </p>
                  <p className="text-[12px] text-muted">
                    {rub(product.price)} / {product.unit} · кратность {packingOf(product).packSize}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
