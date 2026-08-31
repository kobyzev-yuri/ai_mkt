"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { rating } from "@/lib/format";
import { companies, products } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { trustOf } from "@/lib/trust";

export default function CompaniesPage() {
  const { reputations } = useStore();
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Участники</p>
      <h1 className="mt-2 font-display text-5xl">Компании и их агенты</h1>
      <p className="mt-3 max-w-xl text-muted">
        Каталожные звёзды — витрина. Рабочий рейтинг — on-time отгрузка и on-time оплата.{" "}
        <Link href="/trust" className="text-brass">
          Методика →
        </Link>
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {companies.map((c) => {
          const n = products.filter((p) => p.sellerId === c.id).length;
          const t = trustOf(c.id, reputations);
          return (
            <Link key={c.id} href={`/companies/${c.id}`} className="border border-line bg-surface p-5 hover:border-brass/40">
              <div className="flex items-center gap-2">
                <Badge tone={c.role === "seller" ? "brass" : "default"}>
                  {c.role === "seller" ? "поставщик" : "закупщик"}
                </Badge>
                <span className="font-mono text-[11px] text-muted">{c.city}</span>
              </div>
              <h2 className="mt-3 font-display text-3xl">{c.name}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{c.blurb}</p>
              <p className="mt-4 font-mono text-[11px] text-brass">
                агент «{c.agent.name}» · доверие {t.score} · отгрузка {t.onTimeShipPct}% · оплата {t.onTimePayPct}%
                {n ? ` · ${n} позиций` : ""}
              </p>
              <p className="mt-1 font-mono text-[10px] text-muted">каталог {rating(c.rating)}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
