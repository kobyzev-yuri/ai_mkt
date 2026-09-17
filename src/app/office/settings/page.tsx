"use client";

import { OLLAMA_MODELS } from "@/lib/ollama";
import { compactRub } from "@/lib/format";
import { CONTROL_MODE_LABEL, policyOf } from "@/lib/policy";
import { companies } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";

const TONE: Record<string, string> = {
  firm: "жёсткий",
  flexible: "гибкий",
  premium: "премиум",
};

const PRIORITY: Record<string, string> = {
  price: "цена",
  speed: "срок",
  quality: "качество",
};

export default function OfficeSettingsPage() {
  const { llmModel, setLlmModel, resetDemo, lastBuyerId, lastSellerId, policies } = useStore();
  const [models, setModels] = useState<{ id: string; label: string }[]>(
    OLLAMA_MODELS.map((m) => ({ id: m.id, label: m.label })),
  );
  const buyers = companies.filter((c) => c.role !== "seller");
  const sellers = companies.filter((c) => c.role !== "buyer");

  useEffect(() => {
    fetch("/api/ollama/models")
      .then((r) => r.json())
      .then((data: { models?: { id: string; label: string }[] }) => {
        if (data.models?.length) setModels(data.models);
      })
      .catch(() => {
        /* keep static list */
      });
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Бэкофис · настройки</p>
      <h1 className="mt-2 font-display text-5xl">Политика среды</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
        Мандат задаёт пол цены. Политику торговли (пошагово / допуски / автопилот) меняет участник в своём кабинете.
        Модель пишет только реплики. Сброс возвращает демо-партии, комнаты и политики.
      </p>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="border border-line bg-surface p-5">
          <h2 className="font-display text-2xl">Локальная модель</h2>
          <p className="mt-2 text-[13px] text-muted">Ollama озвучивает торг. Цифры считает движок, не эта модель.</p>
          <label className="mt-4 block font-mono text-[10px] uppercase tracking-widest text-muted" htmlFor="office-model">
            Модель реплик
          </label>
          <select
            id="office-model"
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            className="mt-2 w-full rounded-full border border-line bg-bg px-3 py-2 font-mono text-[12px] text-paper outline-none"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="border border-line bg-surface p-5">
          <h2 className="font-display text-2xl">Сессия площадки</h2>
          <p className="mt-2 text-[13px] text-muted">
            Последний закупщик: {companies.find((c) => c.id === lastBuyerId)?.short ?? lastBuyerId}. Последний
            поставщик: {companies.find((c) => c.id === lastSellerId)?.short ?? lastSellerId}.
          </p>
          <button
            type="button"
            onClick={resetDemo}
            className="mt-5 rounded-full border border-line px-5 py-2 text-[13px] text-paper hover:border-brass/50"
          >
            Сбросить демо
          </button>
        </div>
      </section>

      <MandateGroup title="Закупщики" rows={buyers} policies={policies} />
      <MandateGroup title="Поставщики" rows={sellers} policies={policies} />
    </div>
  );
}

function MandateGroup({
  title,
  rows,
  policies,
}: {
  title: string;
  rows: typeof companies;
  policies: ReturnType<typeof useStore>["policies"];
}) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-[13px] text-muted">
        Политику меняет сам участник в кабинете. Здесь видно, как сейчас пускают сделки.
      </p>
      <div className="mt-5 divide-y divide-line border border-line">
        {rows.map((c) => {
          const policy = policyOf(c, policies);
          return (
            <div key={c.id} className="bg-surface px-4 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-display text-2xl">{c.short}</p>
                <p className="font-mono text-[11px] text-brass">агент «{c.agent.name}»</p>
              </div>
              <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted">{c.agent.mandate}</p>
              <p className="mt-2 font-mono text-[11px] text-muted">
                {CONTROL_MODE_LABEL[policy.controlMode]} · {TONE[c.agent.tone] ?? c.agent.tone} ·{" "}
                {PRIORITY[c.agent.priority] ?? c.agent.priority} · допуск {compactRub(policy.autoApproveBelow)} · мин.
                доверие {policy.minTrustToAuto} · пол маржи {c.agent.minMarginPct}%
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
