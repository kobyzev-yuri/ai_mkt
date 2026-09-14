"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { DictateButton } from "@/components/dictate-button";
import { Badge } from "@/components/ui";
import { companyById, productById } from "@/lib/agents";
import { compactRub, days, dealStatusLabel, num, qty, rub } from "@/lib/format";
import { memosFor } from "@/lib/partner-memo";
import { PLATFORM_CATEGORIES, sanitizeNeed } from "@/lib/parse-need";
import { DEMO_PROMPTS } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { Deal, Need } from "@/lib/types";
import { PartnerMemoCard } from "@/components/partner-memo";
import { RejectCardView } from "@/components/reject-card";

type Phase = "idle" | "parse" | "review" | "talk" | "done";

type Draft = {
  category: string;
  keywords: string;
  qty: string;
  unit: string;
  budget: string;
  city: string;
  deadlineDays: string;
};

function draftFromNeed(need: Need): Draft {
  return {
    category: need.category ?? "",
    keywords: need.keywords.join(", "),
    qty: need.qty != null ? String(need.qty) : "",
    unit: need.unit ?? "",
    budget: need.budget != null ? String(need.budget) : "",
    city: need.city ?? "",
    deadlineDays: need.deadlineDays != null ? String(need.deadlineDays) : "",
  };
}

function needFromDraft(query: string, draft: Draft): Need {
  const qtyN = Number(draft.qty.replace(/\s/g, "").replace(",", "."));
  const budgetN = Number(draft.budget.replace(/\s/g, "").replace(",", "."));
  const daysN = Number(draft.deadlineDays.replace(/\s/g, ""));
  return sanitizeNeed(query, {
    category: draft.category || undefined,
    keywords: draft.keywords.split(/[,;]+/),
    qty: Number.isFinite(qtyN) && qtyN > 0 ? qtyN : undefined,
    unit: draft.unit || undefined,
    budget: Number.isFinite(budgetN) && budgetN > 0 ? budgetN : undefined,
    city: draft.city || undefined,
    deadlineDays: Number.isFinite(daysN) && daysN > 0 ? daysN : undefined,
  });
}

function RfqInner() {
  const params = useSearchParams();
  const preset = params.get("q") ?? "";
  return <RfqComposer key={preset} preset={preset} />;
}

function RfqComposer({ preset }: { preset: string }) {
  const router = useRouter();
  const { company, parseRfq, launchRfq, deals, rfqs, orders, reputations, llmModel } = useStore();
  const [query, setQuery] = useState(preset);
  const [phase, setPhase] = useState<Phase>("idle");
  const [draft, setDraft] = useState<Draft>(draftFromNeed({ query: "", keywords: [] }));
  const [rules, setRules] = useState<Need | null>(null);
  const [rfqId, setRfqId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [llmNote, setLlmNote] = useState<string | null>(null);

  const mine = useMemo(() => (rfqId ? deals.filter((d) => d.rfqId === rfqId) : []), [deals, rfqId]);
  const rfq = rfqs.find((r) => r.id === rfqId);
  const busy = phase === "parse" || phase === "talk";
  const history = useMemo(
    () => (company.role === "seller" ? [] : memosFor(company, deals, orders, reputations).slice(0, 3)),
    [company, deals, orders, reputations],
  );

  async function parse(raw?: string) {
    let text = (raw ?? query).trim();
    if (!text) {
      text = DEMO_PROMPTS[0];
      setQuery(text);
    }
    if (text.length < 3) {
      setError("Напишите или скажите, что закупаете — хотя бы товар.");
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
      const parsed = await parseRfq(text);
      setDraft(draftFromNeed(parsed.need));
      setRules(parsed.rules);
      setLlmNote(
        parsed.llm
          ? `Разбор дополнил ${parsed.model}. Цифры из фразы правила не отдают модели.`
          : `Ollama не ответила — показан разбор правилами. Модель: ${parsed.model}.`,
      );
      setPhase("review");
    } catch {
      setError("Не удалось разобрать заявку. Проверьте Ollama и попробуйте ещё раз.");
      setPhase("idle");
    }
  }

  async function confirm() {
    const text = query.trim();
    const need = needFromDraft(text, draft);
    setError(null);
    setPhase("talk");
    try {
      const created = await launchRfq(text, need);
      setRfqId(created.rfq.id);
      setLlmNote(
        created.llm
          ? `Реплики написал ${created.model}. Цены и пол мандата задал движок.`
          : `Ollama не ответила — показан шаблон мандата. Модель: ${created.model}.`,
      );
      setPhase("done");
    } catch {
      setError("Не удалось открыть комнаты. Проверьте Ollama и попробуйте ещё раз.");
      setPhase("review");
    }
  }

  const best = [...mine].filter((d) => d.status === "agreed" || d.status === "approved").sort((a, b) => b.score - a.score)[0];

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12">
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
          Скажите или напишите фразу. Агент «{company.agent.name}» ({company.short}) разберёт её через {llmModel}.
          Пока вы не подтвердите полку — комнаты не откроются. Цифры считает движок мандата.
        </p>
      )}

      {history.length > 0 && phase === "idle" ? (
        <div className="mt-8 space-y-3">
          {history.map((memo) => (
            <PartnerMemoCard key={memo.partnerId} memo={memo} name={companyById(memo.partnerId).short} />
          ))}
        </div>
      ) : null}

      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void parse();
          }
        }}
        rows={4}
        placeholder="Нужно 50 000 коробок 300×200×150, крафт, доставка в Казань за 14 дней, бюджет до 2,1 млн"
        className="mt-8 w-full border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-muted focus:border-brass/50"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <DictateButton
          disabled={busy || company.role === "seller"}
          onFinal={(text) => setQuery((q) => (q.trim() ? `${q.trim()} ${text}` : text))}
        />
        <p className="font-mono text-[11px] text-muted">Ctrl+Enter — разбор. Пустое поле подставит пример.</p>
      </div>
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

      {phase !== "review" && phase !== "talk" && phase !== "done" ? (
        <button
          type="button"
          onClick={() => void parse()}
          disabled={busy}
          className="mt-6 rounded-full bg-brass px-6 py-3 text-[14px] font-medium text-bg disabled:opacity-50"
        >
          {phase === "parse" ? `Разбор · ${llmModel}…` : "Разобрать заявку"}
        </button>
      ) : null}
      {error ? <p className="mt-3 text-[13px] text-terra">{error}</p> : null}
      {llmNote && phase !== "review" ? <p className="mt-3 text-[13px] text-brass">{llmNote}</p> : null}

      {phase !== "idle" && (
        <ol className="mt-10 space-y-2 font-mono text-[12px] text-muted">
          <Step n="01" active label="Разбор потребности" />
          <Step n="02" active={phase === "review" || phase === "talk" || phase === "done"} label="Страховка разбора" />
          <Step n="03" active={phase === "talk" || phase === "done"} label="Подбор поставщиков" />
          <Step n="04" active={phase === "done"} label="Рассылка и торг" />
        </ol>
      )}

      {(phase === "review" || phase === "talk") && (
        <NeedReview
          draft={draft}
          rules={rules}
          note={llmNote}
          busy={phase === "talk"}
          onChange={setDraft}
          onConfirm={() => void confirm()}
          onBack={() => {
            setPhase("idle");
            setRfqId(null);
          }}
        />
      )}

      {phase === "done" && rfq && (
        <div className="mt-10">
          <NeedStrip rfqQuery={rfq.need.query} qty={rfq.need.qty} budget={rfq.need.budget} city={rfq.need.city} />
          {mine.length === 0 ? (
            <div className="mt-6 space-y-3">
              {(rfq.rejects ?? []).length ? (
                rfq.rejects!.map((card) => (
                  <RejectCardView key={`${card.productId ?? card.fact}-${card.codes.join("-")}`} card={card} />
                ))
              ) : (
                <p className="text-muted">Агент не нашёл позиций с достаточным совпадением. Уточните категорию или SKU.</p>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {mine.map((d) => (
                <DealRow key={d.id} deal={d} />
              ))}
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

function NeedReview({
  draft,
  rules,
  note,
  busy,
  onChange,
  onConfirm,
  onBack,
}: {
  draft: Draft;
  rules: Need | null;
  note: string | null;
  busy: boolean;
  onChange: (next: Draft) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const field = (key: keyof Draft) => ({
    value: draft[key],
    onChange: (e: { target: { value: string } }) => onChange({ ...draft, [key]: e.target.value }),
  });
  const input = "mt-1 w-full border border-line bg-bg px-3 py-2 text-[14px] outline-none focus:border-brass/50";
  const shelfMismatch = Boolean(rules?.category && draft.category && rules.category !== draft.category);

  return (
    <div className="mt-10 border border-brass/40 bg-surface p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-brass">Страховка · подтвердите полку</p>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        Модель не исправляет себя второй раз. Если полка не та — смените её здесь. Поиск идёт только после этой кнопки.
      </p>
      {note ? <p className="mt-3 text-[13px] text-brass">{note}</p> : null}
      {shelfMismatch ? (
        <p className="mt-3 text-[13px] text-terra">
          Правила видели «{rules?.category}», в карточке сейчас «{draft.category}». Проверьте, прежде чем искать.
        </p>
      ) : null}
      {!draft.category ? (
        <p className="mt-3 text-[13px] text-terra">
          Полка не задана — агент будет искать по словам. Лучше выбрать категорию витрины.
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-[12px] text-muted">
          Полка витрины
          <select {...field("category")} className={input}>
            <option value="">не задана</option>
            {PLATFORM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[12px] text-muted">
          Город
          <input {...field("city")} className={input} placeholder="Казань" />
        </label>
        <label className="block text-[12px] text-muted">
          Объём
          <input {...field("qty")} className={input} inputMode="numeric" placeholder="по MOQ" />
        </label>
        <label className="block text-[12px] text-muted">
          Единица
          <input {...field("unit")} className={input} placeholder="шт" />
        </label>
        <label className="block text-[12px] text-muted">
          Бюджет, ₽
          <input {...field("budget")} className={input} inputMode="numeric" placeholder="не указан" />
        </label>
        <label className="block text-[12px] text-muted">
          Срок, дни
          <input {...field("deadlineDays")} className={input} inputMode="numeric" placeholder="не указан" />
        </label>
        <label className="block text-[12px] text-muted sm:col-span-2">
          Ключевые слова
          <input {...field("keywords")} className={input} placeholder="крафт, короб, 300" />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="rounded-full bg-brass px-6 py-3 text-[14px] font-medium text-bg disabled:opacity-50"
        >
          {busy ? "Открываю комнаты…" : "Полка верная · искать партии"}
        </button>
        <button type="button" onClick={onBack} disabled={busy} className="text-[13px] text-muted disabled:opacity-50">
          Назад к тексту
        </button>
      </div>
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

function DealRow({ deal }: { deal: Deal }) {
  const product = productById(deal.productId);
  const seller = companyById(deal.sellerId);
  return (
    <Link href={`/deals/${deal.id}`} className="block border border-line bg-surface p-4 hover:border-brass/40">
      <div className="flex items-center justify-between gap-3">
        <Badge
          tone={deal.status === "agreed" || deal.status === "approved" ? "moss" : deal.status === "rejected" ? "terra" : "live"}
        >
          {dealStatusLabel(deal.status)}
        </Badge>
        <span className="font-mono text-[11px] text-muted">оценка {deal.score}</span>
      </div>
      <p className="mt-2 font-display text-xl">{seller.short}</p>
      <p className="text-[13px] text-muted">{product.name}</p>
      <p className="mt-2 font-mono text-[12px] text-brass">
        {rub(deal.currentPrice)} / {product.unit} · {compactRub(deal.currentPrice * deal.qty)}
      </p>
      <p className="mt-2 text-[12px] text-muted">{deal.matchReasons.slice(0, 2).join(" · ")}</p>
      {deal.reject ? <p className="mt-2 text-[12px] text-terra">Что дальше: {deal.reject.nextStep}</p> : null}
    </Link>
  );
}

export default function RfqPage() {
  return (
    <Suspense fallback={<div className="px-5 py-16 text-muted">Загрузка…</div>}>
      <RfqInner />
    </Suspense>
  );
}
