"use client";

import { useEffect, useRef, useState } from "react";
import { AgentBus } from "@/components/agent-bus";
import { Pipeline } from "@/components/pipeline";
import { AgentMark, Badge } from "@/components/ui";
import { companyById, productById } from "@/lib/agents";
import { compactRub, days, dealStatusLabel, deliveryLine, qty, rub } from "@/lib/format";
import { parseNeed } from "@/lib/parse-need";
import { DEMO_QUERY, type AgentRoleId } from "@/lib/scenarios";
import { useStore } from "@/lib/store";
import type { Deal, Order } from "@/lib/types";

type Phase = "idle" | "parse" | "match" | "talk" | "gate" | "fulfill" | "incident" | "done";

const PHASE_ROLES: Record<Phase, AgentRoleId[]> = {
  idle: [],
  parse: ["orchestrator", "parser"],
  match: ["matcher", "mandate"],
  talk: ["buyer-agent", "seller-agent", "mandate"],
  gate: ["human"],
  fulfill: ["human", "fulfillment"],
  incident: ["ops", "buyer-agent", "seller-agent"],
  done: ["orchestrator", "platform"],
};

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("aborted", "AbortError"));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export default function DemoPage() {
  const {
    prepareShowcase,
    approveDeal,
    payAdvance,
    acceptDelivery,
    payRemainder,
    reportIncident,
    acceptIncidentRemedy,
    deals,
    orders,
    resetDemo,
  } = useStore();

  const [phase, setPhase] = useState<Phase>("idle");
  const [rfqId, setRfqId] = useState<string | null>(null);
  const [dealId, setDealId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [msgShown, setMsgShown] = useState(0);
  const [caption, setCaption] = useState("Нажмите «Запустить прогон» — агенты пройдут S1 → S2 → S3 без ручной навигации.");
  const abortRef = useRef<AbortController | null>(null);

  const deal = deals.find((d) => d.id === dealId);
  const order = orders.find((o) => o.id === orderId);
  const rooms = rfqId ? deals.filter((d) => d.rfqId === rfqId) : [];

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function run() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const { signal } = ctrl;
    setOrderId(null);
    setMsgShown(0);
    setPhase("parse");
    setCaption("Парсер разбирает свободный текст. Числа, которых нет в заявке, не выдумываются.");
    try {
      const created = prepareShowcase(DEMO_QUERY);
      setRfqId(created.rfq.id);
      const best =
        [...created.deals].filter((d) => d.status === "agreed").sort((a, b) => b.score - a.score)[0] ?? created.deals[0];
      setDealId(best?.id ?? null);
      await wait(900, signal);

      setPhase("match");
      setCaption("Поиск свободных партий: наличие, кратность, город, поставки в срок. До трёх комнат параллельно.");
      await wait(1100, signal);

      setPhase("talk");
      setCaption("Агенты торгуются в мандате. Движок считает цену; реплики — пояснение, не источник истины.");
      if (best) {
        for (let i = 1; i <= best.messages.length; i += 1) {
          setMsgShown(i);
          await wait(640, signal);
        }
      }
      await wait(400, signal);

      setPhase("gate");
      setCaption("Подтверждение человека: утверждение. Агенты сошлись — списывать деньги они не могут.");
      await wait(1200, signal);
      if (!best) throw new Error("no deal");
      const nextOrder = approveDeal(best.id);
      if (!nextOrder) throw new Error("no order");
      setOrderId(nextOrder);
      await wait(700, signal);

      setPhase("fulfill");
      setCaption("Подтверждение казначейства: аванс. Только после него склад резервирует партии и выпускает накладную.");
      payAdvance(nextOrder);
      await wait(1600, signal);

      setPhase("incident");
      setCaption("Срыв отгрузки. Агент предлагает кредит в остаток. Рейтинг пока не трогаем.");
      const incId = reportIncident(nextOrder, "delay_ship");
      await wait(1400, signal);
      if (incId) acceptIncidentRemedy(nextOrder, incId);
      setCaption("Стороны приняли обход. Контур идёт дальше: приёмка и остаток.");
      await wait(900, signal);

      acceptDelivery(nextOrder);
      await wait(800, signal);
      payRemainder(nextOrder);
      setPhase("done");
      setCaption("Цикл закрыт. Человек подтвердил четыре шага. Поиск, торг, резерв, документы и обход сделали агенты.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setCaption("Прогон остановился. Сбросьте демо и запустите снова.");
      setPhase("idle");
    }
  }

  function stop() {
    abortRef.current?.abort();
    setPhase("idle");
    setCaption("Прогон остановлен.");
  }

  const busy = phase !== "idle" && phase !== "done";

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Демо-прогон · S0 → S3</p>
      <h1 className="mt-2 font-display text-5xl leading-tight">Демо: агенты закрывают закупку</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
        Партии уже на витрине (как после выгрузки 1С). Кофейня Холдинг закупает 50&nbsp;000 крафт-коробок. Агенты ищут
        свободный остаток, торгуются, резервируют склад и закрывают срыв. Человек подтверждает ключевые шаги. Без входа в
        кабинеты.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="rounded-full bg-brass px-6 py-3 text-[14px] font-medium text-bg disabled:opacity-50"
        >
          {busy ? "Идёт прогон…" : phase === "done" ? "Прогнать ещё раз" : "Запустить прогон"}
        </button>
        {busy ? (
          <button type="button" onClick={stop} className="rounded-full border border-line px-5 py-3 text-[14px] text-muted">
            Остановить
          </button>
        ) : null}
        <button type="button" onClick={resetDemo} className="rounded-full border border-line px-5 py-3 text-[14px] text-muted">
          Сбросить демо
        </button>
      </div>
      <p className="mt-5 max-w-2xl text-[14px] leading-relaxed text-brass-2">{caption}</p>

      <div className="mt-8">
        <AgentBus active={PHASE_ROLES[phase]} />
      </div>

      <ol className="mt-6 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-wider">
        {(
          [
            ["parse", "Разбор"],
            ["match", "Матч"],
            ["talk", "Торг"],
            ["gate", "Утверждение"],
            ["fulfill", "Исполнение"],
            ["incident", "Срыв"],
            ["done", "Закрыт"],
          ] as const
        ).map(([id, label]) => (
          <li
            key={id}
            className={`rounded-full border px-3 py-1 ${
              phase === id ? "border-brass text-brass-2" : "border-line text-muted"
            }`}
          >
            {label}
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="min-h-[24rem] border border-line bg-surface p-5">
          {phase === "idle" && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Заявка</p>
              <p className="mt-3 font-display text-2xl leading-snug">«{DEMO_QUERY}»</p>
              <p className="mt-4 text-[14px] text-muted">
                После старта оркестратор разложит это на разбор, три комнаты и подтверждения человека.
              </p>
            </div>
          )}
          {phase === "parse" && <NeedBlock />}
          {phase === "match" && <MatchBlock rooms={rooms} />}
          {phase === "talk" && deal && <TalkBlock deal={deal} shown={msgShown} />}
          {phase === "gate" && deal && <GateBlock deal={deal} />}
          {(phase === "fulfill" || phase === "incident" || phase === "done") && order && (
            <FulfillBlock order={order} phase={phase} />
          )}
        </section>

        <aside className="space-y-4">
          <div className="border border-line bg-bg p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Что делает человек</p>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-muted">
              <li className={phase === "gate" ? "text-paper" : ""}>01 · Утвердить условия, которые сошлись в мандате</li>
              <li className={phase === "fulfill" ? "text-paper" : ""}>02 · Оплатить аванс — иначе склад стоит</li>
              <li className={phase === "incident" || phase === "done" ? "text-paper" : ""}>
                03 · Принять обход или эскалировать
              </li>
              <li className={phase === "done" ? "text-paper" : ""}>04 · Подписать приёмку и оплатить остаток</li>
            </ul>
          </div>
          {deal && (
            <div className="border border-line bg-bg p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Мандаты</p>
              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                <span className="text-paper">Закуп.</span> {companyById(deal.buyerId).agent.mandate}
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                <span className="text-paper">{companyById(deal.sellerId).agent.name}.</span>{" "}
                {companyById(deal.sellerId).agent.mandate}
              </p>
              <p className="mt-4 font-mono text-[11px] text-brass">
                пол {rub(deal.floorPrice)} · сейчас {rub(deal.currentPrice)}
              </p>
            </div>
          )}
          {order && (
            <div className="border border-line bg-bg p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Документы в контуре</p>
              <ul className="mt-3 space-y-1 text-[13px] text-muted">
                {order.documents.map((d) => (
                  <li key={d.id}>
                    {d.title} <span className="font-mono text-[11px] text-brass">{d.ref}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function NeedBlock() {
  const need = parseNeed(DEMO_QUERY);
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Структура потребности</p>
      <p className="mt-3 text-[14px] text-paper">«{DEMO_QUERY}»</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
        <Pair k="Категория" v={need.category ?? "—"} />
        <Pair k="Объём" v={need.qty ? String(need.qty) : "—"} />
        <Pair k="Город" v={need.city ?? "—"} />
        <Pair k="Бюджет" v={need.budget ? compactRub(need.budget) : "—"} />
        <Pair k="Срок" v={need.deadlineDays ? days(need.deadlineDays) : "—"} />
      </dl>
    </div>
  );
}

function MatchBlock({ rooms }: { rooms: Deal[] }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Комнаты</p>
      <ul className="mt-4 space-y-3">
        {rooms.map((d) => {
          const p = productById(d.productId);
          const s = companyById(d.sellerId);
          return (
            <li key={d.id} className="border border-line px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={d.status === "agreed" ? "moss" : "live"}>{dealStatusLabel(d.status)}</Badge>
                <span className="font-mono text-[11px] text-muted">оценка {d.score}</span>
              </div>
              <p className="mt-2 font-display text-xl">{s.short}</p>
              <p className="text-[13px] text-muted">{p.name}</p>
              <p className="mt-1 font-mono text-[12px] text-brass">
                {rub(d.currentPrice)} / {p.unit} · {compactRub(d.currentPrice * d.qty)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TalkBlock({ deal, shown }: { deal: Deal; shown: number }) {
  const buyer = companyById(deal.buyerId);
  const seller = companyById(deal.sellerId);
  const visible = deal.messages.slice(0, shown);
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {buyer.agent.name} ↔ {seller.agent.name}
      </p>
      <ol className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
        {visible.map((m) => (
          <li key={m.id} className="rise flex gap-3">
            {m.from === "system" ? (
              <p className="w-full border border-dashed border-line px-3 py-2 font-mono text-[12px] text-muted">{m.text}</p>
            ) : (
              <>
                <AgentMark name={m.from === "buyer-agent" ? buyer.agent.name : seller.agent.name} />
                <p className="text-[13px] leading-relaxed text-paper/90">{m.text}</p>
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function GateBlock({ deal }: { deal: Deal }) {
  const p = productById(deal.productId);
  return (
    <div>
      <Badge tone="terra">подтверждение человека</Badge>
      <h2 className="mt-3 font-display text-3xl">Утвердить сделку</h2>
      <p className="mt-3 text-[14px] leading-relaxed text-muted">
        {qty(deal.qty, p.unit)} × {rub(deal.currentPrice)} = {compactRub(deal.currentPrice * deal.qty)}. Предоплата{" "}
        {deal.prepayPct}%. Пол продавца {rub(deal.floorPrice)} — не пересечён.
      </p>
      <p className="mt-4 font-mono text-[12px] text-brass">Демо подтверждает шаг само, в бою это кнопка закупщика.</p>
    </div>
  );
}

function FulfillBlock({ order, phase }: { order: Order; phase: Phase }) {
  const p = productById(order.productId);
  const last = order.events.slice(-4);
  return (
    <div>
      <Pipeline status={order.status} compact />
      <p className="mt-4 font-display text-2xl">{p.name}</p>
      <p className="text-[13px] text-muted">
        {deliveryLine(order.incoterm, order.destination)} · {compactRub(order.total)}
      </p>
      {phase === "incident" && (
        <p className="mt-4 border border-terra/40 px-3 py-2 text-[13px] text-terra">
          Инцидент: срыв отгрузки. Обход — кредит в счёт остатка. Рейтинг не меняется, пока стороны согласны.
        </p>
      )}
      <ol className="mt-4 space-y-2">
        {last.map((e) => (
          <li key={e.id} className="border border-dashed border-line px-3 py-2 text-[13px] text-muted">
            <span className="font-mono text-[10px] uppercase text-brass">{e.stage}</span>
            <span className="mt-1 block text-paper/90">{e.text}</span>
          </li>
        ))}
      </ol>
      {phase === "done" && (
        <p className="mt-4 border border-moss/40 px-3 py-2 text-[14px] text-moss">
          Заказ закрыт. Партии списаны, аванс и остаток оплачены.
        </p>
      )}
    </div>
  );
}

function Pair({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">{k}</dt>
      <dd className="mt-0.5">{v}</dd>
    </div>
  );
}
