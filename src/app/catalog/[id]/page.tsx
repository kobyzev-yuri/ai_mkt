"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, CategorySeal } from "@/components/ui";
import { days, num, rating, rub } from "@/lib/format";
import { freeQty } from "@/lib/inventory";
import { packingOf } from "@/lib/packing";
import { companies, products } from "@/lib/seed";
import { useSession } from "@/lib/session";
import { useStore } from "@/lib/store";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { account } = useSession();
  const { lots, company } = useStore();
  const desk = account?.desk;
  const product = products.find((p) => p.id === id);
  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-muted">Позиция не найдена.</p>
      </div>
    );
  }
  const seller = companies.find((c) => c.id === product.sellerId)!;
  const related = products.filter((p) => p.sellerId === product.sellerId && p.id !== product.id).slice(0, 3);
  const pack = packingOf(product);
  const productLots = lots.filter((l) => l.productId === product.id);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <Link href="/catalog" className="font-mono text-[11px] uppercase tracking-widest text-muted">
        ← Каталог
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex items-center gap-4">
            <CategorySeal category={product.category} />
            <Badge>{product.category}</Badge>
          </div>
          <h1 className="mt-5 font-display text-5xl leading-tight">{product.name}</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">{product.description}</p>
          <dl className="mt-8 grid grid-cols-2 gap-px border border-line bg-line">
            {Object.entries(product.specs).map(([k, v]) => (
              <div key={k} className="bg-surface px-4 py-3">
                <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">{k}</dt>
                <dd className="mt-1 text-[14px]">{v}</dd>
              </div>
            ))}
            <div className="bg-surface px-4 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">Кратность</dt>
              <dd className="mt-1">
                {pack.packUnit} {num(pack.packSize)} {product.unit}
              </dd>
            </div>
            <div className="bg-surface px-4 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">MOQ</dt>
              <dd className="mt-1">
                {num(product.moq)} {product.unit}
              </dd>
            </div>
          </dl>

          <h2 className="mt-10 font-display text-3xl">Партии</h2>
          <div className="mt-4 divide-y divide-line border border-line">
            {productLots.map((lot) => {
              const free = freeQty(lot);
              return (
                <div key={lot.id} className="flex flex-col gap-1 bg-surface px-4 py-3 sm:flex-row sm:justify-between">
                  <div>
                    <p className="font-mono text-[12px] text-brass">{lot.batchNo}</p>
                    <p className="text-[13px] text-muted">
                      {lot.warehouse} · {lot.certs.join(", ")}
                    </p>
                  </div>
                  <p className="font-mono text-[13px]">
                    свободно {num(free)} {lot.unit}
                    {lot.reserved ? ` · резерв ${num(lot.reserved)}` : ""}
                    {lot.readyDays ? ` · ${days(lot.readyDays)}` : " · сейчас"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <aside className="border border-line bg-surface p-6">
          <p className="font-display text-4xl text-brass-2">
            {rub(product.price)}
            <span className="ml-2 font-sans text-[14px] text-muted">/ {product.unit}</span>
          </p>
          <p className="mt-2 font-mono text-[11px] text-muted">
            Партиями от {num(product.moq)} {product.unit} · {pack.packUnit} {num(pack.packSize)}
          </p>
          {desk === "buy" ? (
            <Link
              href={`/rfq?q=${encodeURIComponent(`Нужно ${Math.max(product.moq * 10, pack.packSize * 10)} ${product.unit} — ${product.name}, бюджет ориентир ${Math.round(product.price * product.moq * 10 * 0.95)}`)}`}
              className="mt-6 flex w-full items-center justify-center rounded-full bg-brass py-3 text-[14px] font-medium text-bg hover:bg-brass-2"
            >
              Поручить агенту набрать партию
            </Link>
          ) : desk === "sell" ? (
            <Link
              href={seller.id === company.id ? "/sell/lots" : "/sell"}
              className="mt-6 flex w-full items-center justify-center rounded-full border border-line py-3 text-[14px] text-paper hover:border-brass/50"
            >
              {seller.id === company.id ? "Это ваша витрина" : "Чужая позиция · вы поставщик"}
            </Link>
          ) : (
            <p className="mt-6 border border-dashed border-line px-3 py-3 text-[13px] leading-relaxed text-muted">
              Заявку с витрины подаёт закупщик, не площадка.
            </p>
          )}
          <Link href={`/companies/${seller.id}`} className="mt-8 block border-t border-line pt-5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Поставщик</p>
            <p className="mt-1 font-display text-2xl">{seller.name}</p>
            <p className="mt-1 text-[13px] text-muted">
              {seller.city} · рейтинг {rating(seller.rating)} · агент «{seller.agent.name}»
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">{seller.blurb}</p>
          </Link>
        </aside>
      </div>
      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="font-display text-3xl">Ещё у {seller.short}</h2>
          <ul className="mt-4 space-y-2">
            {related.map((p) => (
              <li key={p.id}>
                <Link href={`/catalog/${p.id}`} className="flex justify-between border border-line bg-surface px-4 py-3 text-[14px] hover:border-brass/40">
                  <span>{p.name}</span>
                  <span className="font-mono text-brass">{rub(p.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
