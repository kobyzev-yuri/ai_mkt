"use client";

import Link from "next/link";
import { Stat } from "@/components/ui";
import { evaluateMarketplace } from "@/lib/effectiveness";
import { companies } from "@/lib/seed";
import { useStore } from "@/lib/store";

const PILLARS = [
  {
    href: "/concept",
    kicker: "Идеология",
    title: "Среда, не каталог с ботом",
    text: "Зачем агенты встречаются в общем контуре, кто человек и что нельзя отдать модели.",
  },
  {
    href: "/office/settings",
    kicker: "Настройки",
    title: "Мандаты, модель, демо",
    text: "Политика агентов организаций, локальная модель для реплик, сброс сессии площадки.",
  },
  {
    href: "/trust",
    kicker: "Аналитика",
    title: "Контроль и оценка",
    text: "Пол цены, подтверждения человека, доверие, журнал действий. Не операционный кабинет.",
  },
];

export default function OfficePage() {
  const { deals, orders, reputations, auditLog, llmModel } = useStore();
  const kpi = evaluateMarketplace(deals, orders, reputations);
  const sellers = companies.filter((c) => c.role === "seller").length;
  const buyers = companies.filter((c) => c.role !== "seller").length;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Бэкофис платформы</p>
      <h1 className="mt-2 font-display text-5xl leading-tight">Идеология, настройка и аналитика</h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
        Здесь живёт Atrium как площадка: зачем так устроено, как задан мандат, как считаем агентов. Закупки и поставки —
        отдельные кабинеты организаций. С контрагентами работают они, не этот контур.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PILLARS.map((p) => (
          <Link key={p.href} href={p.href} className="border border-line bg-surface p-5 hover:border-brass/40">
            <p className="font-mono text-[10px] uppercase tracking-widest text-brass">{p.kicker}</p>
            <h2 className="mt-3 font-display text-2xl">{p.title}</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">{p.text}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-4">
        <Stat label="Пол цены соблюдён" value={`${kpi.mandateOkPct}%`} />
        <Stat label="Комнаты согласованы" value={`${kpi.agreedPct}%`} hint={`${kpi.rooms} в сессии`} />
        <Stat label="Записей в журнале" value={String(auditLog.length)} />
        <Stat label="Модель реплик" value={llmModel} hint={`${buyers} закупщиков · ${sellers} поставщиков`} />
      </div>

      <section className="mt-12 border border-line bg-surface p-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-brass">Прогон для жюри</p>
        <h2 className="mt-2 font-display text-3xl">Полный цикл без ручной навигации</h2>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted">
          Заявка, торг, утверждение, аванс, срыв отгрузки, обход и закрытие. Ollama не обязательна.
        </p>
        <Link
          href="/demo"
          className="mt-6 inline-flex rounded-full bg-brass px-6 py-3 text-[14px] font-medium text-bg hover:bg-brass-2"
        >
          Смотреть прогон сделки
        </Link>
      </section>
    </div>
  );
}
