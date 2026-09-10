"use client";

import Link from "next/link";
import { Badge, Stat } from "@/components/ui";
import { companyById, productById } from "@/lib/agents";
import { compactRub, dealStatusLabel, deliveryLine, orderStatusLabel, rating } from "@/lib/format";
import { BARGAIN_TACTICS, tacticLabel } from "@/lib/bargain";
import { useStore } from "@/lib/store";
import { trustOf } from "@/lib/trust";
import { counterpartiesOf } from "@/lib/workspace";

export function Cabinet({ side }: { side: "buy" | "sell" }) {
  const { company, deals, rfqs, orders, reputations, setTactic } = useStore();
  const isSeller = side === "sell";
  const mine = deals.filter((d) => (isSeller ? d.sellerId === company.id : d.buyerId === company.id));
  const incoming = mine.filter((d) => d.status === "countering" || d.status === "agreed" || d.status === "open");
  const won = mine.filter((d) => d.status === "approved");
  const volume = won.reduce((s, d) => s + d.currentPrice * d.qty, 0);
  const myOrders = orders.filter((o) => (isSeller ? o.sellerId === company.id : o.buyerId === company.id));
  const partners = counterpartiesOf(company.id, deals, orders, reputations);
  const liveDeals = isSeller ? incoming : mine.filter((d) => d.status !== "rejected");

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">
        {isSeller ? "Кабинет поставщика" : "Кабинет закупщика"}
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl">{company.name}</h1>
          <p className="mt-2 max-w-2xl text-muted">
            {company.city} · {company.industry} · ИНН {company.inn} · каталог {rating(company.rating)} · доверие{" "}
            {trustOf(company.id, reputations).score} ·{" "}
            {isSeller
              ? `отгрузка ${trustOf(company.id, reputations).onTimeShipPct}%`
              : `оплата ${trustOf(company.id, reputations).onTimePayPct}%`}
          </p>
        </div>
        {isSeller ? (
          <Link href="/deals" className="font-mono text-[11px] uppercase tracking-widest text-brass">
            Входящие сделки →
          </Link>
        ) : (
          <Link href="/rfq" className="rounded-full bg-brass px-5 py-2.5 text-[13px] font-medium text-bg hover:bg-brass-2">
            Новая заявка
          </Link>
        )}
      </div>

      <div className="mt-8 border border-brass/30 bg-surface p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-brass">Агент «{company.agent.name}»</p>
        <p className="mt-2 font-display text-2xl">Мандат {isSeller ? "поставки" : "закупки"}</p>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">{company.agent.mandate}</p>
        <p className="mt-3 font-mono text-[11px] text-muted">
          тактика {tacticLabel(company.agent.tactic)} · тон {company.agent.tone} · автоутверждение до{" "}
          {compactRub(company.agent.autoApproveBelow)}
        </p>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-widest text-muted">Как агент торгуется</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {BARGAIN_TACTICS.map((t) => {
            const on = company.agent.tactic === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTactic(t.id)}
                className={`border px-3 py-3 text-left ${on ? "border-brass/50 bg-bg" : "border-line hover:border-brass/30"}`}
              >
                <p className="font-display text-lg">{t.label}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted">{t.blurb}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-4">
        <Stat
          label={isSeller ? "Входящие заявки" : "Мои заявки"}
          value={String(isSeller ? incoming.length : rfqs.filter((r) => r.buyerId === company.id).length)}
        />
        <Stat label="Утверждено" value={String(won.length)} />
        <Stat label="В исполнении" value={String(myOrders.filter((o) => o.status !== "settled").length)} />
        <Stat label="Оборот с контрагентами" value={compactRub(volume)} />
      </div>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl">Контрагенты</h2>
            <p className="mt-2 max-w-xl text-[14px] text-muted">
              {isSeller
                ? "Закупщики, с которыми агент ведёт комнаты и отгрузку. Не площадка целиком — только ваши стороны."
                : "Поставщики, с которыми открыты комнаты и заказы. Здесь работаете вы, не бэкофис площадки."}
            </p>
          </div>
          <Link href="/companies" className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-brass">
            Все участники →
          </Link>
        </div>
        <div className="mt-5 divide-y divide-line border border-line">
          {partners.length === 0 ? (
            <div className="bg-surface px-4 py-8 text-[14px] text-muted">
              <p>
                {isSeller
                  ? "Пока нет закупщиков в работе. Когда контрагент запустит заявку, он появится здесь."
                  : "Пока нет поставщиков у этой организации. Запустите заявку — или откройте кабинет, где в демо уже есть комнаты."}
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block font-mono text-[11px] uppercase tracking-widest text-brass"
              >
                Войти под другой организацией →
              </Link>
            </div>
          ) : (
            partners.map((row) => (
              <Link
                key={row.company.id}
                href={`/companies/${row.company.id}`}
                className="flex flex-col gap-2 bg-surface px-4 py-4 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-display text-xl">{row.company.short}</p>
                  <p className="text-[13px] text-muted">
                    {row.company.city} · {row.company.industry} · доверие {row.trust}
                  </p>
                </div>
                <p className="font-mono text-[12px] text-brass">
                  {row.rooms} комн. · {row.liveOrders} в работе · {compactRub(row.volume)}
                </p>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl">{isSeller ? "Входящие переговоры" : "Активные закупки"}</h2>
          <Link href="/deals" className="font-mono text-[11px] uppercase tracking-widest text-brass">
            Все сделки →
          </Link>
        </div>
        <div className="mt-5 divide-y divide-line border border-line">
          {liveDeals.length === 0 ? (
            <p className="bg-surface px-4 py-8 text-[14px] text-muted">
              {isSeller
                ? "Нет входящих комнат. Перейдите в закупки от имени холдинга и запустите заявку — затем вернитесь сюда."
                : "Запустите агента закупки — комнаты с поставщиками появятся здесь."}
            </p>
          ) : (
            liveDeals.map((d) => {
              const p = productById(d.productId);
              const other = companyById(isSeller ? d.buyerId : d.sellerId);
              return (
                <Link
                  key={d.id}
                  href={`/deals/${d.id}`}
                  className="flex flex-col gap-1 bg-surface px-4 py-4 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Badge
                      tone={
                        d.status === "agreed" || d.status === "approved"
                          ? "moss"
                          : d.status === "rejected"
                            ? "terra"
                            : "live"
                      }
                    >
                      {dealStatusLabel(d.status)}
                    </Badge>
                    <p className="mt-2 font-display text-xl">{p.name}</p>
                    <p className="text-[13px] text-muted">{other.short}</p>
                  </div>
                  <p className="font-mono text-brass">{compactRub(d.currentPrice * d.qty)}</p>
                </Link>
              );
            })
          )}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl">Исполнение с контрагентами</h2>
          <Link href="/orders" className="font-mono text-[11px] uppercase tracking-widest text-brass">
            Все заказы →
          </Link>
        </div>
        <div className="mt-5 divide-y divide-line border border-line">
          {myOrders.length === 0 ? (
            <p className="bg-surface px-4 py-8 text-[14px] text-muted">
              Утвердите сделку — появится счёт, резерв партий и отгрузка.
            </p>
          ) : (
            myOrders.map((o) => {
              const p = productById(o.productId);
              const other = companyById(isSeller ? o.buyerId : o.sellerId);
              return (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className="flex flex-col gap-1 bg-surface px-4 py-4 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Badge tone={o.status === "settled" ? "moss" : "live"}>{orderStatusLabel(o.status)}</Badge>
                    <p className="mt-2 font-display text-xl">{p.name}</p>
                    <p className="text-[13px] text-muted">
                      {other.short} · {deliveryLine(o.incoterm, o.destination)}
                    </p>
                  </div>
                  <p className="font-mono text-brass">{compactRub(o.total)}</p>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
