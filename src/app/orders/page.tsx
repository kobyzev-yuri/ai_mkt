"use client";

import Link from "next/link";
import { Pipeline } from "@/components/pipeline";
import { Badge } from "@/components/ui";
import { companyById, productById } from "@/lib/agents";
import { compactRub, deliveryLine, orderStatusLabel } from "@/lib/format";
import { packLabel } from "@/lib/packing";
import { useStore } from "@/lib/store";

export default function OrdersPage() {
  const { orders, company } = useStore();
  const mine = orders.filter((o) => o.buyerId === company.id || o.sellerId === company.id);
  const list = mine;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">
        {company.role === "seller" ? "Поставки" : "Закупки"} · исполнение
      </p>
      <h1 className="mt-2 font-display text-5xl">Партии с контрагентами</h1>
      <p className="mt-3 max-w-xl text-muted">
        После согласования агенты проводят счёт, резерв партий, отгрузку и приёмку. Человек подтверждает оплату и приёмку.
        Показаны только заказы «{company.short}».
      </p>
      <div className="mt-8 space-y-4">
        {list.length === 0 ? (
          <p className="border border-line bg-surface px-4 py-8 text-[14px] text-muted">
            Нет заказов у этой организации. Утвердите сделку в кабинете.
          </p>
        ) : (
        list.map((o) => {
          const p = productById(o.productId);
          const seller = companyById(o.sellerId);
          const buyer = companyById(o.buyerId);
          return (
            <Link key={o.id} href={`/orders/${o.id}`} className="block border border-line bg-surface p-5 hover:border-brass/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge tone={o.status === "settled" ? "moss" : o.status.includes("due") ? "brass" : "live"}>
                  {orderStatusLabel(o.status)}
                </Badge>
                <span className="font-mono text-[12px] text-brass">{compactRub(o.total)}</span>
              </div>
              <h2 className="mt-3 font-display text-2xl">{p.name}</h2>
              <p className="mt-1 text-[13px] text-muted">
                {packLabel(o.qty, p)} · {buyer.short} → {seller.short} · {deliveryLine(o.incoterm, o.destination)}
              </p>
              {(o.incidents ?? []).some((i) => i.status !== "resolved") && (
                <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-terra">открыт инцидент</p>
              )}
              <div className="mt-4">
                <Pipeline status={o.status} compact />
              </div>
            </Link>
          );
        })
        )}
      </div>
    </div>
  );
}
