"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { companyById, productById } from "@/lib/agents";
import { buyerDeals, buyerOrders, isHistoryOrder } from "@/lib/buy-desk";
import { compactRub, dealStatusLabel, orderStatusLabel } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function BuyHistoryPage() {
  const { company, deals, orders } = useStore();
  const closedOrders = buyerOrders(orders, company.id).filter(isHistoryOrder);
  const rejected = buyerDeals(deals, company.id).filter((d) => d.status === "rejected");

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">История · закрытые</p>
      <h1 className="mt-2 font-display text-5xl">Что уже закрыто</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
        Исполненные и сорванные заказы, комнаты где не сошлись. Без текущих переговоров.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-3xl">Заказы</h2>
        <div className="mt-5 divide-y divide-line border border-line">
          {closedOrders.length === 0 ? (
            <p className="bg-surface px-4 py-8 text-[14px] text-muted">Закрытых заказов пока нет.</p>
          ) : (
            closedOrders.map((o) => {
              const p = productById(o.productId);
              return (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className="flex flex-col gap-2 bg-surface px-4 py-4 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Badge tone={o.status === "settled" ? "moss" : "terra"}>{orderStatusLabel(o.status)}</Badge>
                    <p className="mt-2 font-display text-xl">{p.name}</p>
                    <p className="text-[13px] text-muted">{companyById(o.sellerId).short}</p>
                  </div>
                  <p className="font-mono text-[13px] text-brass">{compactRub(o.total)}</p>
                </Link>
              );
            })
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl">Не сошлись</h2>
        <div className="mt-5 divide-y divide-line border border-line">
          {rejected.length === 0 ? (
            <p className="bg-surface px-4 py-8 text-[14px] text-muted">Отклонённых комнат нет.</p>
          ) : (
            rejected.map((d) => {
              const p = productById(d.productId);
              return (
                <Link
                  key={d.id}
                  href={`/deals/${d.id}`}
                  className="flex flex-col gap-2 bg-surface px-4 py-4 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Badge tone="terra">{dealStatusLabel(d.status)}</Badge>
                    <p className="mt-2 font-display text-xl">{p.name}</p>
                    <p className="text-[13px] text-muted">{companyById(d.sellerId).short}</p>
                  </div>
                  <p className="font-mono text-[13px] text-brass">{compactRub(d.currentPrice * d.qty)}</p>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
