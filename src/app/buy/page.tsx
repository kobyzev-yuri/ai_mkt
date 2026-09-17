"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { companyById, productById } from "@/lib/agents";
import {
  buyerDeals,
  buyerOrders,
  hasOpenIncident,
  isLiveDeal,
  isLiveOrder,
  orderGateAction,
} from "@/lib/buy-desk";
import { compactRub, dealStatusLabel, orderStatusLabel } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function BuyLivePage() {
  const { company, deals, orders } = useStore();
  const mine = buyerDeals(deals, company.id);
  const mineOrders = buyerOrders(orders, company.id);

  const gates = [
    ...mine
      .filter((d) => d.status === "agreed")
      .map((d) => {
        const p = productById(d.productId);
        return {
          href: `/deals/${d.id}`,
          action: "Утвердить сделку",
          status: dealStatusLabel(d.status),
          title: p.name,
          party: companyById(d.sellerId).short,
          money: d.currentPrice * d.qty,
        };
      }),
    ...mineOrders
      .filter((o) => orderGateAction(o))
      .map((o) => {
        const p = productById(o.productId);
        return {
          href: hasOpenIncident(o) ? `/orders/${o.id}/incident` : `/orders/${o.id}`,
          action: orderGateAction(o)!,
          status: hasOpenIncident(o) ? "открыт инцидент" : orderStatusLabel(o.status),
          title: p.name,
          party: companyById(o.sellerId).short,
          money: o.total,
        };
      }),
  ];

  const watching = [
    ...mine
      .filter((d) => isLiveDeal(d) && d.status !== "agreed")
      .map((d) => {
        const p = productById(d.productId);
        return {
          href: `/deals/${d.id}`,
          status: dealStatusLabel(d.status),
          title: p.name,
          party: companyById(d.sellerId).short,
          money: d.currentPrice * d.qty,
        };
      }),
    ...mineOrders
      .filter((o) => isLiveOrder(o) && !orderGateAction(o))
      .map((o) => {
        const p = productById(o.productId);
        return {
          href: `/orders/${o.id}`,
          status: orderStatusLabel(o.status),
          title: p.name,
          party: companyById(o.sellerId).short,
          money: o.total,
        };
      }),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Контроль · текущие сделки</p>
      <h1 className="mt-2 font-display text-5xl">Ваши решения</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
        Агенты ведут поиск и торг. Здесь только то, где нужен человек: утвердить, оплатить, принять — или зайти в процесс.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-3xl">Ждут вас{gates.length ? ` · ${gates.length}` : ""}</h2>
        <div className="mt-5 divide-y divide-line border border-line">
          {gates.length === 0 ? (
            <p className="bg-surface px-4 py-8 text-[14px] text-muted">
              Сейчас нет шагов, где нужна ваша подпись.{" "}
              <Link href="/rfq" className="text-brass">
                Новая заявка
              </Link>
            </p>
          ) : (
            gates.map((row) => (
              <Link
                key={row.href}
                href={row.href}
                className="flex flex-col gap-2 bg-surface px-4 py-4 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brass">{row.action}</Badge>
                    <span className="font-mono text-[11px] text-muted">{row.status}</span>
                  </div>
                  <p className="mt-2 font-display text-xl">{row.title}</p>
                  <p className="text-[13px] text-muted">{row.party}</p>
                </div>
                <p className="font-mono text-[13px] text-brass">{compactRub(row.money)}</p>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl">Агенты в работе{watching.length ? ` · ${watching.length}` : ""}</h2>
        <div className="mt-5 divide-y divide-line border border-line">
          {watching.length === 0 ? (
            <p className="bg-surface px-4 py-8 text-[14px] text-muted">Нет открытых комнат и отгрузок без вашей подписи.</p>
          ) : (
            watching.map((row) => (
              <Link
                key={row.href}
                href={row.href}
                className="flex flex-col gap-2 bg-surface px-4 py-4 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Badge tone="live">{row.status}</Badge>
                  <p className="mt-2 font-display text-xl">{row.title}</p>
                  <p className="text-[13px] text-muted">{row.party}</p>
                </div>
                <p className="font-mono text-[13px] text-brass">{compactRub(row.money)}</p>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
