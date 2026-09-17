"use client";

import { TradePolicyEditor } from "@/components/trade-policy";
import { BARGAIN_TACTICS, tacticLabel } from "@/lib/bargain";
import { compactRub } from "@/lib/format";
import { policyOf } from "@/lib/policy";
import { useStore } from "@/lib/store";

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

export function MandatePolicy({ side }: { side: "buy" | "sell" }) {
  const { company, setTactic, setPolicy, policies } = useStore();
  const agent = company.agent;
  const seller = side === "sell";
  const policy = policyOf(company, policies);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Политика · мандат</p>
      <h1 className="mt-2 font-display text-5xl">Как агент торгуется</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
        {seller
          ? "По умолчанию агент только торгуется в мандате и не опускается ниже пола. Вы входите на критическом: крупная партия, слабое доверие, спор, возврат резерва. Деньги и приёмка всегда ваши."
          : "По умолчанию агент только торгуется в мандате. Вы входите на критическом: крупная партия, слабое доверие, спор. Деньги и товар всегда утверждаете вы."}
      </p>

      <section className="mt-10 border border-line bg-surface p-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-brass">Агент «{agent.name}»</p>
        <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-paper">{agent.mandate}</p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">Тактика</dt>
            <dd className="mt-1 text-[15px]">{tacticLabel(agent.tactic)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">Приоритет</dt>
            <dd className="mt-1 text-[15px]">{PRIORITY[agent.priority] ?? agent.priority}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">Автоутверждение до</dt>
            <dd className="mt-1 text-[15px]">{compactRub(agent.autoApproveBelow)}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">Тон</dt>
            <dd className="mt-1 text-[15px]">{TONE[agent.tone] ?? agent.tone}</dd>
          </div>
          {seller ? (
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">Пол маржи</dt>
              <dd className="mt-1 text-[15px]">{agent.minMarginPct}%</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-3xl">Тактика торга</h2>
        <p className="mt-2 max-w-xl text-[14px] text-muted">
          Меняет, как агент ходит в мандате. Пол цены считает движок, не эта настройка.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {BARGAIN_TACTICS.map((t) => {
            const on = agent.tactic === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTactic(t.id)}
                className={`border px-4 py-4 text-left ${on ? "border-brass/50 bg-surface" : "border-line hover:border-brass/30"}`}
              >
                <p className="font-display text-2xl">{t.label}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{t.blurb}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-3xl">Когда входить человеку</h2>
        <p className="mt-2 max-w-xl text-[14px] text-muted">
          Штатный режим — критические моменты. Ужесточить или ослабить можно здесь: по важности партии и по истории с
          контрагентом. Деньги и приёмка всегда за человеком.
        </p>
        <TradePolicyEditor policy={policy} onChange={setPolicy} />
      </section>
    </div>
  );
}
