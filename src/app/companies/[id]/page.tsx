"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { Badge, Stat } from "@/components/ui";
import { rating } from "@/lib/format";
import { companies, products } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { trustOf } from "@/lib/trust";

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const { reputations } = useStore();
  const company = companies.find((c) => c.id === id);
  if (!company) {
    return <div className="px-5 py-16 text-muted">Компания не найдена.</div>;
  }
  const catalog = products.filter((p) => p.sellerId === company.id);
  const trust = trustOf(company.id, reputations);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <Link href="/catalog" className="font-mono text-[11px] uppercase tracking-widest text-muted">
        ← К витрине
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Badge tone="brass">{company.role === "seller" ? "Поставщик" : "Закупщик"}</Badge>
        <Badge>каталог {rating(company.rating)}</Badge>
        <Badge tone={trust.score >= 85 ? "moss" : trust.score < 75 ? "terra" : "brass"}>
          доверие {trust.score}
        </Badge>
      </div>
      <h1 className="mt-4 font-display text-5xl">{company.name}</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{company.blurb}</p>
      <p className="mt-3 font-mono text-[11px] text-muted">
        {company.city} · {company.industry} · ИНН {company.inn} · на площадке с {company.since} ·{" "}
        {company.dealsClosed} сделок
      </p>

      <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-4">
        <Stat label="On-time отгрузка" value={`${trust.onTimeShipPct}%`} hint="как SOPI у продавца" />
        <Stat label="On-time оплата" value={`${trust.onTimePayPct}%`} hint="ниже 85% — аванс выше" />
        <Stat label="Претензии" value={`${trust.claimRatePct}%`} hint="ворота / спецификация" />
        <Stat label="Abnormal fulfill" value={`${trust.abnormalFulfillPct}%`} hint="срывы без закрытия" />
      </div>

      <div className="mt-8 border border-line bg-surface p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-brass">Агент «{company.agent.name}»</p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{company.agent.mandate}</p>
      </div>

      {catalog.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-3xl">Каталог</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
