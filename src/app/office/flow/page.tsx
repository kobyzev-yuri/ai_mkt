"use client";

import { LangflowCanvas } from "@/components/langflow-canvas";
import { LangflowRunner } from "@/components/langflow-runner";

export default function OfficeFlowPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Бэкофис · Langflow</p>
      <h1 className="mt-2 font-display text-5xl leading-tight">Схема взаимодействия агентов</h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
        Тот же граф, что в Langflow: оркестратор раскладывает S1–S3, человек подтверждает разбор, стороны торгуются,
        мандат считает числа, человек подписывает. В Langflow это поток «Atrium · шина агентов», не пункт в списке
        проектов. Запуск:{" "}
        <span className="font-mono text-paper">./langflow/start.sh</span>.
      </p>
      <p className="mt-3 text-[13px] text-muted">
        Кабинеты закупки и поставки не здесь — они работают с контрагентами. Живой прогон с выводом агентов в этот
        кабинет не входит.
      </p>
      <div className="mt-10">
        <LangflowCanvas />
      </div>
      <LangflowRunner />
    </div>
  );
}
