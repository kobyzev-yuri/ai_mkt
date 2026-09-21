"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui";
import { companyById, productById } from "@/lib/agents";
import type { DbSnapshot } from "@/lib/db/types";
import { compactRub, orderStatusLabel } from "@/lib/format";
import { canUnwindIncident, unwindButtonLabel } from "@/lib/incident-desk";
import { openDisputes, paymentWatch } from "@/lib/office-desk";
import { useStore } from "@/lib/store";
import { INCIDENT_LABEL } from "@/lib/trust";

export default function OfficeHomePage() {
  const { orders, resolveOnPlatform, breakPaidOrder } = useStore();
  const disputes = openDisputes(orders);
  const escalated = disputes.filter((d) => d.incident.status === "escalated");
  const payments = paymentWatch(orders);
  const [registry, setRegistry] = useState<{ skus: number; companies: number; deals: number } | null>(null);

  useEffect(() => {
    fetch("/api/db")
      .then((r) => r.json())
      .then((data: DbSnapshot) => {
        if (!data.skus) return;
        setRegistry({ skus: data.skus.length, companies: data.companies.length, deals: data.deals.length });
      })
      .catch(() => {
        /* seed still in browser */
      });
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Бэкофис · посредник</p>
      <h1 className="mt-2 font-display text-5xl">Atrium не сторона сделки</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
        Площадка держит состояние, может провести деньги через номинал, решает спор по документам в заказе и
        онбордит номенклатуру. Не закупщик и не поставщик.
      </p>
      {registry ? (
        <p className="mt-4 font-mono text-[12px] text-muted">
          SQLite · {registry.skus} SKU · {registry.companies} участников · {registry.deals} сделок в реестре ·{" "}
          <Link href="/office/nomenclature" className="text-brass">
            справочник →
          </Link>
        </p>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-3xl">Споры{disputes.length ? ` · ${disputes.length}` : ""}</h2>
        <p className="mt-2 max-w-xl text-[14px] text-muted">
          Сначала стороны 7 дней. На площадку — только эскалация. Рейтинг бьём только здесь.
        </p>
        <div className="mt-5 divide-y divide-line border border-line">
          {disputes.length === 0 ? (
            <p className="bg-surface px-4 py-8 text-[14px] text-muted">Открытых претензий нет.</p>
          ) : (
            disputes.map(({ order, incident }) => {
              const p = productById(order.productId);
              return (
                <div
                  key={incident.id}
                  className="flex flex-col gap-3 bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={incident.status === "escalated" ? "terra" : "brass"}>
                        {INCIDENT_LABEL[incident.kind]}
                      </Badge>
                      <span className="font-mono text-[11px] text-muted">
                        {incident.status === "escalated" ? "у площадки" : "ещё у сторон"}
                      </span>
                    </div>
                    <p className="mt-2 font-display text-xl">{p.name}</p>
                    <p className="text-[13px] text-muted">
                      {companyById(order.buyerId).short} ↔ {companyById(order.sellerId).short}
                    </p>
                    <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">{incident.proposed.text}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Link href={`/orders/${order.id}/incident`} className="font-mono text-[11px] uppercase tracking-widest text-brass">
                      Комната претензии →
                    </Link>
                    {incident.status === "escalated" ? (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => resolveOnPlatform(order.id, incident.id)}
                          className="rounded-full border border-terra/50 px-3 py-1.5 text-[12px] text-terra"
                        >
                          Зафиксировать обход
                        </button>
                        {canUnwindIncident(order, incident) ? (
                          <button
                            type="button"
                            onClick={() => breakPaidOrder(order.id, incident.id)}
                            className="rounded-full border border-line px-3 py-1.5 text-[12px] text-paper"
                          >
                            {unwindButtonLabel(order, incident) ?? "Откат"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {escalated.length === 0 && disputes.length > 0 ? (
          <p className="mt-3 text-[13px] text-muted">Эскалаций нет — стороны ещё в окне обхода.</p>
        ) : null}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl">Факты оплаты{payments.length ? ` · ${payments.length}` : ""}</h2>
        <p className="mt-2 max-w-xl text-[14px] text-muted">
          Движок ждёт событие «оплачено». На прямом рельсе его шлёт банк стороны. На номинале — банк площадки.
        </p>
        <div className="mt-5 divide-y divide-line border border-line">
          {payments.length === 0 ? (
            <p className="bg-surface px-4 py-8 text-[14px] text-muted">Нет счетов, ждущих факт оплаты.</p>
          ) : (
            payments.map((o) => {
              const p = productById(o.productId);
              const buyer = companyById(o.buyerId);
              const seller = companyById(o.sellerId);
              return (
                <div
                  key={o.id}
                  className="flex flex-col gap-2 bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Badge tone="brass">{orderStatusLabel(o.status)}</Badge>
                    <p className="mt-2 font-display text-xl">
                      <Link href={`/orders/${o.id}`} className="hover:text-brass-2">
                        {p.name}
                      </Link>
                    </p>
                    <p className="text-[13px] text-muted">
                      <Link href={`/companies/${buyer.id}`} className="text-brass hover:underline">
                        {buyer.short}
                      </Link>
                      {" → "}
                      <Link href={`/companies/${seller.id}`} className="text-brass hover:underline">
                        {seller.short}
                      </Link>
                    </p>
                  </div>
                  <Link href={`/orders/${o.id}`} className="font-mono text-[13px] text-brass">
                    {compactRub(o.total)}
                  </Link>
                </div>
              );
            })
          )}
        </div>
        <p className="mt-4">
          <Link href="/office/settlement" className="font-mono text-[11px] uppercase tracking-widest text-brass">
            Рельсы оплаты →
          </Link>
        </p>
      </section>
    </div>
  );
}
