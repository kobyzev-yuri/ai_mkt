"use client";

import Link from "next/link";
import { Ticker } from "@/components/ticker";
import { Badge, Stat } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { compactRub, dealStatusLabel, orderStatusLabel, qty, rub } from "@/lib/format";
import { companies, DEMO_PROMPTS, products } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { productById } from "@/lib/agents";

export default function HomePage() {
  const { deals, rfqs, company, orders } = useStore();
  const featured = products.slice(0, 6);
  const live = deals.filter((d) => d.status === "countering" || d.status === "agreed").slice(0, 3);
  const closed = deals.filter((d) => d.status === "approved");
  const turnover = closed.reduce((s, d) => s + d.currentPrice * d.qty, 0);

  return (
    <div>
      <Ticker />
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">B2B agent exchange</p>
        <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] text-paper sm:text-7xl">
          Сделки закрывают агенты.
          <span className="text-brass"> Люди утверждают.</span>
        </h1>
        <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-muted">
          Опишите потребность своими словами. Агент найдёт свободные партии, согласует условия, затем проведёт оплату и отгрузку.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/rfq"
            className="rounded-full bg-brass px-6 py-3 text-[14px] font-medium text-bg hover:bg-brass-2"
          >
            Запустить агента закупки
          </Link>
          <Link
            href="/catalog"
            className="rounded-full border border-line px-6 py-3 text-[14px] text-paper hover:border-brass/50"
          >
            Смотреть каталог
          </Link>
        </div>
        <p className="mt-5 font-mono text-[11px] text-muted">
          Сейчас вы {company.role === "seller" ? "поставщик" : "закупщик"} «{company.short}» · агент «
          {company.agent.name}»
        </p>
      </section>

      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
        <Stat label="В переговорах" value={String(deals.filter((d) => d.status === "countering").length)} />
        <Stat label="RFQ за сессию" value={String(rfqs.length)} />
        <Stat label="Закрытый оборот" value={compactRub(turnover || 18_400_000)} hint="демо + ваши сделки" />
        <Stat label="Поставщиков" value={String(companies.filter((c) => c.role === "seller").length)} />
      </div>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-display text-4xl">Как устроена площадка</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3 lg:grid-cols-6">
          {[
            {
              n: "01",
              t: "Поиск",
              d: "Агент ищет свободные партии: наличие, кратность упаковки, склад, сертификат, срок готовности.",
            },
            {
              n: "02",
              t: "Согласование",
              d: "RFQ и торг в пределах мандата: цена, предоплата, FCA/DAP, объём, кратный паллете или связке.",
            },
            {
              n: "03",
              t: "Оплата",
              d: "Счёт на аванс. Казначейство платит — только тогда склад резервирует лоты.",
            },
            {
              n: "04",
              t: "Отгрузка",
              d: "Комплектация партий, ТТН, УПД, паспорта. Груз уходит на объект покупателя.",
            },
            {
              n: "05",
              t: "Приёмка",
              d: "Ворота, акт, остаток по отсрочке. Контур закрывается, когда деньги и товар сошлись.",
            },
            {
              n: "06",
              t: "Срыв",
              d: "Опоздали, недовезли, не заплатили — агент предлагает обход. Рейтинг бьём только после решения площадки.",
            },
          ].map((s) => (
            <div key={s.n} className="border border-line bg-surface p-5">
              <p className="font-mono text-[11px] text-brass">{s.n}</p>
              <h3 className="mt-3 font-display text-2xl">{s.t}</h3>
              <p className="mt-3 text-[13px] leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[13px] text-muted">
          Реалистичный контур — не только happy path.{" "}
          <Link href="/trust" className="text-brass">
            Как устроены рейтинги и инциденты →
          </Link>
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl">Живые комнаты</h2>
          <Link href="/deals" className="font-mono text-[11px] uppercase tracking-widest text-brass">
            Все сделки →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {live.map((d) => {
            const p = productById(d.productId);
            const seller = companies.find((c) => c.id === d.sellerId);
            const buyer = companies.find((c) => c.id === d.buyerId);
            return (
              <Link key={d.id} href={`/deals/${d.id}`} className="border border-line bg-surface p-4 hover:border-brass/40">
                <div className="flex items-center justify-between">
                  <Badge tone="live">{dealStatusLabel(d.status)}</Badge>
                  <span className="font-mono text-[11px] text-brass">{rub(d.currentPrice * d.qty)}</span>
                </div>
                <h3 className="mt-3 font-display text-xl leading-snug">{p.name}</h3>
                <p className="mt-2 text-[13px] text-muted">
                  {qty(d.qty, p.unit)} · {buyer?.short} ↔ {seller?.short}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl">Исполнение</h2>
          <Link href="/orders" className="font-mono text-[11px] uppercase tracking-widest text-brass">
            Партии в работе →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {orders.slice(0, 2).map((o) => {
            const p = productById(o.productId);
            return (
              <Link key={o.id} href={`/orders/${o.id}`} className="border border-line bg-surface p-4 hover:border-brass/40">
                <Badge tone="live">{orderStatusLabel(o.status)}</Badge>
                <h3 className="mt-3 font-display text-xl">{p.name}</h3>
                <p className="mt-1 text-[13px] text-muted">
                  {o.incoterm} {o.destination} · {compactRub(o.total)}
                  {(o.incidents ?? []).some((i) => i.status !== "resolved") ? " · открыт инцидент" : ""}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-4xl">Витрина</h2>
          <Link href="/catalog" className="font-mono text-[11px] uppercase tracking-widest text-brass">
            Каталог →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-display text-4xl">Попробуйте живой запрос</h2>
          <p className="mt-3 max-w-xl text-muted">
            Агент разберёт фразу через локальный Ollama, найдёт партии и откроет комнаты. Цены считает движок мандата.
          </p>
          <ul className="mt-8 space-y-3">
            {DEMO_PROMPTS.map((q) => (
              <li key={q}>
                <Link
                  href={`/rfq?q=${encodeURIComponent(q)}`}
                  className="block border border-line bg-bg px-4 py-3 text-[14px] leading-relaxed text-paper/90 hover:border-brass/50"
                >
                  «{q}»
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
