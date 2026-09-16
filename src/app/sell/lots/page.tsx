"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { productById } from "@/lib/agents";
import { days, num } from "@/lib/format";
import { freeQty } from "@/lib/inventory";
import { useStore } from "@/lib/store";

export default function SellLotsPage() {
  const { company, lots } = useStore();
  const mine = lots.filter((l) => l.sellerId === company.id);
  const free = mine.reduce((s, l) => s + freeQty(l), 0);
  const reserved = mine.reduce((s, l) => s + l.reserved, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Витрина · партии</p>
      <h1 className="mt-2 font-display text-5xl">Ваши остатки</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
        Только лоты «{company.short}». Свободно {num(free)}, в резерве {num(reserved)}. Новую выгрузку — из 1С.
      </p>
      <p className="mt-4">
        <Link href="/sell/adapter" className="font-mono text-[11px] uppercase tracking-widest text-brass">
          Выгрузка 1С →
        </Link>
      </p>

      <div className="mt-8 divide-y divide-line border border-line">
        {mine.length === 0 ? (
          <p className="bg-surface px-4 py-8 text-[14px] text-muted">
            Партий нет.{" "}
            <Link href="/sell/adapter" className="text-brass">
              Выложить из 1С
            </Link>
          </p>
        ) : (
          mine.map((lot) => {
            const p = productById(lot.productId);
            return (
              <div key={lot.id} className="flex flex-col gap-2 bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-brass">{lot.batchNo}</span>
                    {lot.readyDays === 0 ? <Badge tone="moss">с наличия</Badge> : <Badge>через {days(lot.readyDays)}</Badge>}
                    {lot.reserved > 0 ? <Badge tone="brass">резерв {num(lot.reserved)}</Badge> : null}
                  </div>
                  <p className="mt-2 font-display text-xl">{p.name}</p>
                  <p className="text-[13px] text-muted">{lot.warehouse}</p>
                </div>
                <p className="font-mono text-[13px] text-brass">
                  qty {num(lot.qty)} · свободно {num(freeQty(lot))} {lot.unit}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
