"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { OfferCompare } from "@/components/offer-compare";
import { companyById, productById } from "@/lib/agents";
import { compactRub, days, num, qty, rub } from "@/lib/format";
import { DEMO_PROMPTS } from "@/lib/seed";
import { useStore } from "@/lib/store";

function RfqInner() {
  const params = useSearchParams();
  const preset = params.get("q") ?? "";
  return <RfqComposer key={preset} preset={preset} />;
}

function RfqComposer({ preset }: { preset: string }) {
  const router = useRouter();
  const { company, launchRfq, deals, rfqs, orders, reputations, policies, llmModel } = useStore();
  const [query, setQuery] = useState(preset);
  const [phase, setPhase] = useState<"idle" | "parse" | "match" | "talk" | "done">("idle");
  const [rfqId, setRfqId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [llmNote, setLlmNote] = useState<string | null>(null);

  const mine = useMemo(() => (rfqId ? deals.filter((d) => d.rfqId === rfqId) : []), [deals, rfqId]);
  const rfq = rfqs.find((r) => r.id === rfqId);

  async function run(raw?: string) {
    let text = (raw ?? query).trim();
    if (!text) {
      text = DEMO_PROMPTS[0];
      setQuery(text);
    }
    if (text.length < 3) {
      setError("Напишите, что закупаете — хотя бы товар. Объём, город и бюджет агент доберёт.");
      return;
    }
    if (company.role === "seller") {
      setError("Заявка создаётся в кабинете закупщика. Перейдите в «Закупки» — организация сменится автоматически.");
      return;
    }
    setError(null);
    setLlmNote(null);
    setPhase("parse");
    try {
      setPhase("talk");
      const created = await launchRfq(text);
      setRfqId(created.rfq.id);
      setLlmNote(
        created.llm
          ? `Реплики написал ${created.model}. Цены и пол мандата задал движок.`
          : `Модель не ответила — показан шаблон мандата. Канал: ${created.model}.`,
      );
      setPhase("done");
    } catch {
      setError("Не удалось запустить агента. Проверьте Timeweb-ключ или запасной Ollama.");
      setPhase("idle");
    }
  }

  const best = [...mine].filter((d) => d.status === "agreed" || d.status === "approved").sort((a, b) => b.score - a.score)[0];

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Закупки · новая заявка</p>
      <h1 className="mt-2 font-display text-5xl leading-tight">Опишите, что нужно купить</h1>
      {company.role === "seller" ? (
        <p className="mt-4 border border-brass/40 bg-surface px-4 py-3 text-[14px] text-muted">
          Сейчас открыта организация-поставщик. Заявка живёт в кабинете закупщика —{" "}
          <Link href="/buy" className="text-brass">
            перейти в закупки
          </Link>
          .
        </p>
      ) : (
      <p className="mt-3 text-muted">
        Агент «{company.agent.name}» ({company.short}) разберёт запрос через {llmModel}, найдёт партии и откроет
        комнаты. Цифры считает движок мандата, формулировки — модель.
      </p>
      )}

      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void run();
          }
        }}
        rows={4}
        placeholder="Нужно 50 000 коробок 300×200×150, крафт, доставка в Казань за 14 дней, бюджет до 2,1 млн"
        className="mt-8 w-full border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-muted focus:border-brass/50"
      />
      <p className="mt-2 font-mono text-[11px] text-muted">
        Пустое поле подставит пример. Ctrl+Enter — запуск. Чипсы ниже вставляют готовую заявку.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {DEMO_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setQuery(p)}
            className="rounded-sm border border-line px-3 py-2 text-left text-[13px] leading-relaxed text-muted hover:border-brass/40 hover:text-paper"
          >
            {p}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void run()}
        disabled={phase !== "idle" && phase !== "done"}
        className="mt-6 rounded-full bg-brass px-6 py-3 text-[14px] font-medium text-bg disabled:opacity-50"
      >
        {phase === "idle" || phase === "done" ? "Запустить агента" : `Модель · ${llmModel}…`}
      </button>
      {error ? <p className="mt-3 text-[13px] text-terra">{error}</p> : null}
      {llmNote ? <p className="mt-3 text-[13px] text-brass">{llmNote}</p> : null}

      {phase !== "idle" && (
        <ol className="mt-10 space-y-2 font-mono text-[12px] text-muted">
          <Step n="01" active label="Разбор потребности" />
          <Step n="02" active={phase === "match" || phase === "talk" || phase === "done"} label="Подбор партий и сверка спецификации" />
          <Step n="03" active={phase === "talk" || phase === "done"} label="Рассылка запросов и торг" />
          <Step n="04" active={phase === "done"} label="Сводка по комнатам" />
        </ol>
      )}

      {phase === "done" && rfq && (
        <div className="mt-10">
          <NeedStrip rfqQuery={rfq.need.query} qty={rfq.need.qty} budget={rfq.need.budget} city={rfq.need.city} />
          {mine.length === 0 ? (
            <p className="mt-6 text-muted">Агент не нашёл позиций с достаточным совпадением. Уточните категорию или SKU.</p>
          ) : (
            <div className="mt-6">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted">
                Сравнение КП · цена, срок, предоплата, поставка
              </p>
              <OfferCompare
                deals={mine}
                orders={orders}
                reputations={reputations}
                policies={policies}
                viewerId={company.id}
              />
            </div>
          )}
          {best && (
            <div className="mt-8 border border-brass/40 bg-surface p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-brass">Рекомендация агента</p>
              <p className="mt-2 font-display text-2xl">
                {companyById(best.sellerId).short} · {productById(best.productId).name}
              </p>
              <p className="mt-2 text-[14px] text-muted">
                {qty(best.qty, productById(best.productId).unit)} × {rub(best.currentPrice)} ={" "}
                {compactRub(best.currentPrice * best.qty)} · {days(best.leadDays)} · оценка {best.score}/100
              </p>
              <Link href={`/deals/${best.id}`} className="mt-4 inline-block text-[13px] text-brass-2">
                Открыть комнату и утвердить →
              </Link>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setPhase("idle");
              setRfqId(null);
              router.replace("/rfq");
            }}
            className="mt-6 text-[12px] text-muted"
          >
            Новый запрос
          </button>
        </div>
      )}
    </div>
  );
}

function Step({ n, active, label }: { n: string; active: boolean; label: string }) {
  return (
    <li className={active ? "text-paper" : ""}>
      <span className="text-brass">{n}</span> · {label}
    </li>
  );
}

function NeedStrip({
  rfqQuery,
  qty,
  budget,
  city,
}: {
  rfqQuery: string;
  qty?: number;
  budget?: number;
  city?: string;
}) {
  return (
    <div className="border border-line bg-surface p-4 text-[13px] text-muted">
      <p className="text-paper">«{rfqQuery}»</p>
      <p className="mt-2 font-mono text-[11px]">
        {qty ? `объём ${num(qty)}` : "объём — по MOQ"}
        {budget ? ` · бюджет ${compactRub(budget)}` : ""}
        {city ? ` · ${city}` : ""}
      </p>
    </div>
  );
}

export default function RfqPage() {
  return (
    <Suspense fallback={<div className="px-5 py-16 text-muted">Загрузка…</div>}>
      <RfqInner />
    </Suspense>
  );
}
