"use client";

import Link from "next/link";
import { Ticker } from "@/components/ticker";
import { Badge, Stat } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { compactRub, dealStatusLabel, deliveryLine, orderStatusLabel, qty, rub } from "@/lib/format";
import { companies, DEMO_PROMPTS, products } from "@/lib/seed";
import { useSession } from "@/lib/session";
import { useStore } from "@/lib/store";
import { productById } from "@/lib/agents";

export default function HomePage() {
  const { account } = useSession();
  const { deals, rfqs, company, orders } = useStore();
  const desk = account?.desk;
  const featured = products.slice(0, 6);
  const live = deals.filter((d) => d.status === "countering" || d.status === "agreed").slice(0, 3);
  const closed = deals.filter((d) => d.status === "approved");
  const turnover = closed.reduce((s, d) => s + d.currentPrice * d.qty, 0);
  const party = desk === "buy" || desk === "sell";

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
          {desk === "sell"
            ? "Входящие заявки, партии на витрине и адаптер 1С. Цену и пол считает движок, не чат."
            : desk === "office"
              ? "Вы оператор площадки, не сторона сделки. Каталог — витрина рынка. Заявку подаёт закупщик."
              : "Опишите потребность своими словами. Агенты найдут свободные партии, согласуют условия в мандате и проведут отгрузку. Человек утверждает оплату и приёмку."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {desk === "buy" ? (
            <>
              <Link href="/rfq" className="rounded-full bg-brass px-6 py-3 text-[14px] font-medium text-bg hover:bg-brass-2">
                Новая заявка
              </Link>
              <Link href="/buy" className="rounded-full border border-line px-6 py-3 text-[14px] text-paper hover:border-brass/50">
                Кабинет закупщика
              </Link>
            </>
          ) : desk === "sell" ? (
            <>
              <Link href="/sell" className="rounded-full bg-brass px-6 py-3 text-[14px] font-medium text-bg hover:bg-brass-2">
                Кабинет поставок
              </Link>
              <Link href="/sell/catalog" className="rounded-full border border-line px-6 py-3 text-[14px] text-paper hover:border-brass/50">
                Витрина партий
              </Link>
              <Link href="/sell/adapter" className="rounded-full border border-line px-6 py-3 text-[14px] text-paper hover:border-brass/50">
                Адаптер 1С
              </Link>
            </>
          ) : (
            <Link href="/office" className="rounded-full bg-brass px-6 py-3 text-[14px] font-medium text-bg hover:bg-brass-2">
              Бэкофис
            </Link>
          )}
        </div>
        <p className="mt-5 font-mono text-[11px] text-muted">
          {desk === "office"
            ? "Сейчас вы оператор «Atrium» · не закупщик и не поставщик"
            : `Сейчас вы ${company.role === "seller" ? "поставщик" : "закупщик"} «${company.short}» · агент «${company.agent.name}»`}
        </p>
      </section>

      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
        <Stat label="В переговорах" value={String(deals.filter((d) => d.status === "countering").length)} />
        <Stat label="Заявки за сессию" value={String(rfqs.length)} />
        <Stat label="Закрытый оборот" value={compactRub(turnover || 18_400_000)} hint="демо + ваши сделки" />
        <Stat label="Поставщиков" value={String(companies.filter((c) => c.role === "seller").length)} />
      </div>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-display text-4xl">Как устроена площадка</h2>
        <p className="mt-3 max-w-2xl text-[14px] text-muted">
          Сначала витрина: поставщик грузит партии из 1С. Потом закупка, исполнение, срыв. Агенты встречаются в общем
          контуре — не в свободном чате.
        </p>
        <p className="mt-6 text-[13px] text-muted">
          {desk === "office" ? (
            <>
              Документация контура — в бэкофисе.{" "}
              <Link href="/office" className="text-brass">
                Бэкофис →
              </Link>
            </>
          ) : desk === "sell" ? (
            <>
              Операции поставщика — в кабинете.{" "}
              <Link href="/sell" className="text-brass">
                Кабинет →
              </Link>
              {" · "}
              <Link href="/deals" className="text-brass">
                Входящие сделки →
              </Link>
              {" · "}
              <Link href="/sell/adapter" className="text-brass">
                Адаптер 1С →
              </Link>
            </>
          ) : (
            <>
              Операции закупщика — в кабинете.{" "}
              <Link href="/buy" className="text-brass">
                Кабинет →
              </Link>
              {" · "}
              <Link href="/rfq" className="text-brass">
                Новая заявка →
              </Link>
            </>
          )}
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl">Живые комнаты</h2>
          {party ? (
            <Link
              href={desk === "sell" ? "/sell" : "/buy"}
              className="font-mono text-[11px] uppercase tracking-widest text-brass"
            >
              В кабинет →
            </Link>
          ) : (
            <Link href="/trust" className="font-mono text-[11px] uppercase tracking-widest text-brass">
              Аналитика →
            </Link>
          )}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {live.map((d) => {
            const p = productById(d.productId);
            const seller = companies.find((c) => c.id === d.sellerId);
            const buyer = companies.find((c) => c.id === d.buyerId);
            const card = (
              <>
                <div className="flex items-center justify-between">
                  <Badge tone="live">{dealStatusLabel(d.status)}</Badge>
                  <span className="font-mono text-[11px] text-brass">{rub(d.currentPrice * d.qty)}</span>
                </div>
                <h3 className="mt-3 font-display text-xl leading-snug">{p.name}</h3>
                <p className="mt-2 text-[13px] text-muted">
                  {qty(d.qty, p.unit)} · {buyer?.short} ↔ {seller?.short}
                </p>
              </>
            );
            return party ? (
              <Link key={d.id} href={`/deals/${d.id}`} className="border border-line bg-surface p-4 hover:border-brass/40">
                {card}
              </Link>
            ) : (
              <div key={d.id} className="border border-line bg-surface p-4">
                {card}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl">Исполнение</h2>
          {party ? (
            <Link href="/orders" className="font-mono text-[11px] uppercase tracking-widest text-brass">
              Исполнение в кабинете →
            </Link>
          ) : (
            <Link href="/office/settlement" className="font-mono text-[11px] uppercase tracking-widest text-brass">
              Рельсы расчётов →
            </Link>
          )}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {orders.slice(0, 2).map((o) => {
            const p = productById(o.productId);
            const body = (
              <>
                <Badge tone="live">{orderStatusLabel(o.status)}</Badge>
                <h3 className="mt-3 font-display text-xl">{p.name}</h3>
                <p className="mt-1 text-[13px] text-muted">
                  {deliveryLine(o.incoterm, o.destination)} · {compactRub(o.total)}
                  {(o.incidents ?? []).some((i) => i.status !== "resolved") ? " · открыт инцидент" : ""}
                </p>
              </>
            );
            return party ? (
              <Link key={o.id} href={`/orders/${o.id}`} className="border border-line bg-surface p-4 hover:border-brass/40">
                {body}
              </Link>
            ) : (
              <div key={o.id} className="border border-line bg-surface p-4">
                {body}
              </div>
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

      {desk === "buy" ? (
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
      ) : desk === "sell" ? (
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="font-display text-4xl">Заявки приходят к вам</h2>
            <p className="mt-3 max-w-xl text-muted">
              Живой запрос пишет закупщик. Здесь смотрите входящие комнаты и партии, не подаёте заявку за него.
            </p>
            <Link
              href="/deals"
              className="mt-6 inline-flex rounded-full bg-brass px-6 py-3 text-[14px] font-medium text-bg hover:bg-brass-2"
            >
              Входящие сделки
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
