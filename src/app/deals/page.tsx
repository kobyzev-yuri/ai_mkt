"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { companyById, productById } from "@/lib/agents";
import { compactRub, dealStatusLabel, qty } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function DealsPage() {
  const { deals, company } = useStore();
  const mine = deals.filter((d) => d.buyerId === company.id || d.sellerId === company.id);
  const list = mine.length ? mine : deals;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Комнаты</p>
      <h1 className="mt-2 font-display text-5xl">Сделки агентов</h1>
      <p className="mt-3 max-w-xl text-muted">
        {mine.length
          ? `Показаны комнаты, где участвует ${company.short}.`
          : "У текущей компании пока нет комнат — показан общий поток площадки."}
      </p>
      <div className="mt-8 divide-y divide-line border border-line">
        {list.map((d) => {
          const p = productById(d.productId);
          const seller = companyById(d.sellerId);
          const buyer = companyById(d.buyerId);
          return (
            <Link key={d.id} href={`/deals/${d.id}`} className="flex flex-col gap-2 bg-surface px-4 py-4 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      d.status === "approved" || d.status === "agreed"
                        ? "moss"
                        : d.status === "rejected"
                          ? "terra"
                          : "live"
                    }
                  >
                    {dealStatusLabel(d.status)}
                  </Badge>
                  <span className="font-mono text-[11px] text-muted">
                    {buyer.short} ↔ {seller.short}
                  </span>
                </div>
                <p className="mt-2 font-display text-xl">{p.name}</p>
                <p className="text-[13px] text-muted">{qty(d.qty, p.unit)}</p>
              </div>
              <p className="font-mono text-[13px] text-brass">{compactRub(d.currentPrice * d.qty)}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
