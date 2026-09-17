"use client";

import { Stat } from "@/components/ui";
import { evaluateBuyer } from "@/lib/buy-desk";
import { compactRub } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function BuyAnalyticsPage() {
  const { company, deals, orders, reputations } = useStore();
  const stats = evaluateBuyer(company.id, deals, orders, reputations);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Аналитика · закупки</p>
      <h1 className="mt-2 font-display text-5xl">Как работает агент</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
        Только ваши комнаты и заказы. Не витрина площадки и не чужие поставщики.
      </p>

      <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Ждут вашей подписи" value={String(stats.gates)} />
        <Stat label="В исполнении" value={String(stats.live)} />
        <Stat label="Закрыто заказов" value={String(stats.settled)} />
        <Stat label="Оплачено" value={compactRub(stats.spend)} />
      </div>

      <div className="mt-px grid gap-px border border-line border-t-0 bg-line sm:grid-cols-3">
        <Stat label="Комнаты сошлись" value={`${stats.agreedPct}%`} hint={`${stats.rooms} комнат`} />
        <Stat label="Цена в мандате" value={`${stats.mandateOkPct}%`} />
        <Stat label="Оплата вовремя" value={`${stats.onTimePayPct}%`} hint={`доверие ${stats.trust}`} />
      </div>
    </div>
  );
}
