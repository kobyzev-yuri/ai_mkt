"use client";

import { Stat } from "@/components/ui";
import { compactRub } from "@/lib/format";
import { evaluateSeller } from "@/lib/sell-desk";
import { useStore } from "@/lib/store";

export default function SellAnalyticsPage() {
  const { company, deals, orders, reputations } = useStore();
  const stats = evaluateSeller(company.id, deals, orders, reputations);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Аналитика · поставки</p>
      <h1 className="mt-2 font-display text-5xl">Как работает агент</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
        Только ваши комнаты и заказы. Не витрина площадки и не чужие закупщики.
      </p>

      <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Ждут вашей подписи" value={String(stats.gates)} />
        <Stat label="В исполнении" value={String(stats.live)} />
        <Stat label="Закрыто заказов" value={String(stats.settled)} />
        <Stat label="Выручка" value={compactRub(stats.revenue)} />
      </div>

      <div className="mt-px grid gap-px border border-line border-t-0 bg-line sm:grid-cols-3">
        <Stat label="Комнаты сошлись" value={`${stats.agreedPct}%`} hint={`${stats.rooms} комнат`} />
        <Stat label="Цена не ниже пола" value={`${stats.mandateOkPct}%`} />
        <Stat label="Отгрузка вовремя" value={`${stats.onTimeShipPct}%`} hint={`доверие ${stats.trust}`} />
      </div>
    </div>
  );
}
