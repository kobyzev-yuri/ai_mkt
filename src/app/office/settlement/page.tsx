"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { compactRub, rub } from "@/lib/format";
import {
  SETTLEMENT_CASE,
  SETTLEMENT_PROTOCOL,
  SETTLEMENT_RAILS,
  type SettlementRailId,
} from "@/lib/settlement-rails";

export default function SettlementPage() {
  const [railId, setRailId] = useState<SettlementRailId>("direct");
  const rail = SETTLEMENT_RAILS.find((r) => r.id === railId)!;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Бэкофис · расчёты</p>
      <h1 className="mt-2 font-display text-5xl leading-tight">Рельсы оплаты</h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
        Не налик и не «корзина → карта». Протокол один: два счёта, два факта оплаты, склад после аванса. Меняется
        только рельс денег. Интегратор привозит событие «оплачено»; движок заказа тот же.
      </p>
      <p className="mt-3 text-[13px] text-muted">
        Кейс: {SETTLEMENT_CASE.title}, {rub(SETTLEMENT_CASE.total)}, аванс {SETTLEMENT_CASE.prepayPct}% (
        {compactRub(SETTLEMENT_CASE.advance)}) · остаток {compactRub(SETTLEMENT_CASE.remainder)}. Живые кнопки оплаты —
        в{" "}
        <Link href="/orders" className="text-brass">
          исполнении
        </Link>
        , здесь только карта масштаба.
      </p>

      <ol className="mt-8 grid gap-2 sm:grid-cols-7">
        {SETTLEMENT_PROTOCOL.map((step, i) => (
          <li key={step} className="border border-line bg-surface px-2 py-2">
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted">{String(i + 1).padStart(2, "0")}</p>
            <p className="mt-1 text-[12px] leading-snug">{step}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-wrap gap-2">
        {SETTLEMENT_RAILS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRailId(r.id)}
            className={`rounded-full border px-4 py-2 text-[13px] ${
              r.id === railId ? "border-brass bg-brass text-bg" : "border-line text-muted hover:border-brass/40"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <section className="mt-6 border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brass">{rail.label}</Badge>
          <p className="text-[14px] text-muted">{rail.hint}</p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Meta k="Где деньги" v={rail.whoHolds} />
          <Meta k="Кто шлёт факт в Atrium" v={rail.whoConfirms} />
          <Meta k="Когда продавец видит деньги" v={rail.sellerGetsPaid} />
          <Meta k="На кого масштабировать" v={rail.scale} />
        </div>
        <ol className="mt-8 space-y-3">
          {rail.steps.map((s, i) => (
            <li key={s.id} className="grid gap-1 border border-line bg-bg px-4 py-3 sm:grid-cols-[2rem_1fr_1fr_1fr] sm:items-baseline">
              <p className="font-mono text-[11px] text-brass">{String(i + 1).padStart(2, "0")}</p>
              <p className="text-[15px]">{s.title}</p>
              <p className="font-mono text-[11px] text-muted">{s.atrium}</p>
              <p className="text-[13px] text-muted">{s.money}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{k}</p>
      <p className="mt-2 text-[14px] leading-relaxed">{v}</p>
    </div>
  );
}
