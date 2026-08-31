"use client";

import Link from "next/link";
import { Badge, Stat } from "@/components/ui";
import { companyById, productById } from "@/lib/agents";
import { compactRub, dealStatusLabel, orderStatusLabel, rating } from "@/lib/format";
import { useStore } from "@/lib/store";
import { trustOf } from "@/lib/trust";

export default function DashboardPage() {
  const { company, deals, rfqs, orders, reputations, resetDemo } = useStore();
  const isSeller = company.role === "seller";
  const mine = deals.filter((d) => (isSeller ? d.sellerId === company.id : d.buyerId === company.id));
  const incoming = mine.filter((d) => d.status === "countering" || d.status === "agreed" || d.status === "open");
  const won = mine.filter((d) => d.status === "approved");
  const volume = won.reduce((s, d) => s + d.currentPrice * d.qty, 0);
  const myOrders = orders.filter((o) => (isSeller ? o.sellerId === company.id : o.buyerId === company.id));

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Кабинет</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl">{company.name}</h1>
          <p className="mt-2 text-muted">
            {company.city} · {company.industry} · ИНН {company.inn} · каталог {rating(company.rating)} · доверие{" "}
            {trustOf(company.id, reputations).score} · отгрузка {trustOf(company.id, reputations).onTimeShipPct}% ·
            оплата {trustOf(company.id, reputations).onTimePayPct}%
          </p>
        </div>
        <button type="button" onClick={resetDemo} className="font-mono text-[11px] uppercase tracking-widest text-muted hover:text-paper">
          Сбросить демо
        </button>
      </div>

      <div className="mt-8 border border-brass/30 bg-surface p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-brass">
          Агент «{company.agent.name}»
        </p>
        <p className="mt-2 font-display text-2xl">Мандат</p>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">{company.agent.mandate}</p>
        <p className="mt-3 font-mono text-[11px] text-muted">
          тон {company.agent.tone} · приоритет {company.agent.priority} · автоутверждение до{" "}
          {compactRub(company.agent.autoApproveBelow)}
        </p>
      </div>

      <div className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-4">
        <Stat
          label={isSeller ? "Входящие RFQ" : "Мои RFQ"}
          value={String(isSeller ? incoming.length : rfqs.filter((r) => r.buyerId === company.id).length)}
        />
        <Stat label="Утверждено" value={String(won.length)} />
        <Stat label="В исполнении" value={String(myOrders.filter((o) => o.status !== "settled").length)} />
        <Stat label="Оборот агента" value={compactRub(volume)} />
      </div>

      <section className="mt-12">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl">{isSeller ? "Входящие переговоры" : "Активные закупки"}</h2>
          {!isSeller && (
            <Link href="/rfq" className="font-mono text-[11px] uppercase tracking-widest text-brass">
              Новый RFQ →
            </Link>
          )}
        </div>
        <div className="mt-5 divide-y divide-line border border-line">
          {(isSeller ? incoming : mine).length === 0 ? (
            <p className="bg-surface px-4 py-8 text-[14px] text-muted">
              {isSeller
                ? "Пока нет входящих. Переключитесь на «Волга Ритейл» или «Кофейня Холдинг» и запустите запрос по коробкам — затем вернитесь сюда."
                : "Запустите агента закупки — комнаты появятся здесь."}
            </p>
          ) : (
            (isSeller ? incoming : mine).map((d) => {
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
                      tone={d.status === "agreed" || d.status === "approved" ? "moss" : d.status === "rejected" ? "terra" : "live"}
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
          <h2 className="font-display text-3xl">Исполнение партий</h2>
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
                      {o.incoterm} {o.destination}
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
