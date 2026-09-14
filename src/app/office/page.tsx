"use client";

import Link from "next/link";
import { Stat } from "@/components/ui";
import { evaluateMarketplace } from "@/lib/effectiveness";
import { companies } from "@/lib/seed";
import { useStore } from "@/lib/store";

const PILLARS = [
  {
    href: "/process",
    kicker: "Процессы",
    title: "От 1С до закрытия",
    text: "Документация контура: выгрузка партий, поиск, мандат, подпись. Не прогон сделки.",
  },
  {
    href: "/office/flow",
    kicker: "Схема",
    title: "Схема агентов",
    text: "Граф ролей на шине: кто публикует партии, кто считает пол, кто подписывает.",
  },
  {
    href: "/concept",
    kicker: "Идеология",
    title: "Среда, не каталог с ботом",
    text: "Зачем агенты встречаются в общем контуре, кто человек и что нельзя отдать модели.",
  },
  {
    href: "/office/settlement",
    kicker: "Расчёты",
    title: "Рельсы оплаты",
    text: "Один протокол счетов, три способа провести деньги: прямо, номинал, фактор.",
  },
  {
    href: "/office/settings",
    kicker: "Настройки",
    title: "Мандаты и модель",
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
        отдельные кабинеты организаций. Живой прогон с выводом агентов на эту страницу не входит.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

    </div>
  );
}
