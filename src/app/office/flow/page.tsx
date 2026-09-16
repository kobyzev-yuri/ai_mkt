"use client";

import { AgentGraphCanvas } from "@/components/agent-graph-canvas";

export default function OfficeFlowPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Бэкофис · схема</p>
      <h1 className="mt-2 font-display text-5xl leading-tight">Схема взаимодействия агентов</h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
        Документация контура, не движок сделок. Оркестратор раскладывает S1–S3, человек подтверждает разбор, стороны
        торгуются, мандат считает числа, человек подписывает. Кабинеты считают то же в TypeScript; отдельный Python-холст
        не нужен.
      </p>
      <p className="mt-3 text-[13px] text-muted">
        Кабинеты закупки и поставки не здесь — они работают с контрагентами. Живой прогон:{" "}
        <span className="font-mono text-paper">./start-demo.sh</span> →{" "}
        <a href="http://127.0.0.1:3001/demo" className="font-mono text-brass">
          http://127.0.0.1:3001/demo
        </a>
        . Не порт 3000.
      </p>
      <div className="mt-10">
        <AgentGraphCanvas />
      </div>
    </div>
  );
}
