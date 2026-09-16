"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pipeline } from "@/components/pipeline";
import { AgentMark, Badge } from "@/components/ui";
import { companyById, productById } from "@/lib/agents";
import { compactRub, days, dealStatusLabel, deliveryLine, qty, rub } from "@/lib/format";
import { freeQty, lotsForProduct } from "@/lib/inventory";
import {
  DEMO_1C_CSV,
  SKIP_OWNER_LABEL,
  adapt1CRows,
  parse1CCsv,
} from "@/lib/lot-adapter";
import { parseNeed } from "@/lib/parse-need";
import { DEMO_QUERY, type AgentRoleId } from "@/lib/scenarios";
import { SELLER_ID } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { Deal, Lot, Order } from "@/lib/types";

type Actor = "agent" | "human" | "both";
type ProcessId = "vitrine" | "deal" | "fail";

interface Slide {
  id: string;
  process: ProcessId;
  n: string;
  title: string;
  who: Actor;
  note: string;
  roles: AgentRoleId[];
}

const PROCESSES: { id: ProcessId; n: string; title: string }[] = [
  { id: "vitrine", n: "I", title: "Загрузка витрины" },
  { id: "deal", n: "II", title: "Поиск — торговля — сделка — остатки" },
  { id: "fail", n: "III", title: "Провал сделки — откат" },
];

const SLIDES: Slide[] = [
  {
    id: "csv",
    process: "vitrine",
    n: "01",
    title: "Выгрузка 1С",
    who: "agent",
    note: "Адаптер читает остатки складов. Это вход витрины, ещё не поиск и не сделка.",
    roles: ["seller-agent"],
  },
  {
    id: "skip",
    process: "vitrine",
    n: "02",
    title: "Отсев",
    who: "agent",
    note: "Без пола и услуга доставки на витрину не идут. Кто чинит строку — видно сразу.",
    roles: ["seller-agent", "mandate"],
  },
  {
    id: "publish",
    process: "vitrine",
    n: "03",
    title: "Выложить",
    who: "human",
    note: "Человек подтверждает принятые партии. Чужой остаток и уже занятый резерв адаптер не затирает.",
    roles: ["human"],
  },
  {
    id: "need",
    process: "deal",
    n: "04",
    title: "Заявка",
    who: "human",
    note: "Закупщик говорит свободным текстом. Это вход человека, ещё не поиск и не торг.",
    roles: ["human"],
  },
  {
    id: "parse",
    process: "deal",
    n: "05",
    title: "Разбор",
    who: "agent",
    note: "Парсер достаёт полку, объём, город, бюджет, срок. Чисел, которых нет во фразе, не выдумывает.",
    roles: ["orchestrator", "parser"],
  },
  {
    id: "match",
    process: "deal",
    n: "06",
    title: "Поиск",
    who: "agent",
    note: "Агент смотрит живую витрину: свободный остаток, кратность, город, поставки в срок. До трёх комнат.",
    roles: ["matcher", "mandate"],
  },
  {
    id: "talk",
    process: "deal",
    n: "07",
    title: "Торговля",
    who: "agent",
    note: "Стороны сходятся в мандате. Цену считает движок; реплики — пояснение, не источник истины.",
    roles: ["buyer-agent", "seller-agent", "mandate"],
  },
  {
    id: "gate",
    process: "deal",
    n: "08",
    title: "Сделка",
    who: "human",
    note: "Агенты сошлись — списывать деньги они не могут. В бою это кнопка закупщика.",
    roles: ["human"],
  },
  {
    id: "reserve",
    process: "deal",
    n: "09",
    title: "Резерв",
    who: "agent",
    note: "После утверждения свободный объём уменьшается на резерв. Списания ещё нет — аванса нет.",
    roles: ["fulfillment"],
  },
  {
    id: "writeoff",
    process: "deal",
    n: "10",
    title: "Списание",
    who: "human",
    note: "Казначейство платит, человек принимает. Партии списываются, когда деньги и товар сошлись.",
    roles: ["human", "fulfillment"],
  },
  {
    id: "fail",
    process: "fail",
    n: "11",
    title: "Срыв до аванса",
    who: "human",
    note: "Сделка утверждена, казначейство не платит. Заказ ждёт аванс — резерв висит.",
    roles: ["human"],
  },
  {
    id: "rollback",
    process: "fail",
    n: "12",
    title: "Откат",
    who: "agent",
    note: "Резерв снят, партии снова в поиске. Списывать нечего: оплаты не было.",
    roles: ["ops", "fulfillment"],
  },
];

const ADAPTED = adapt1CRows(parse1CCsv(DEMO_1C_CSV), SELLER_ID);
const ADAPTED_LOTS = ADAPTED.ok.map((x) => x.lot);
const KRAFT = "p-box-kraft";

const ROLE_NAME: Partial<Record<AgentRoleId, string>> = {
  orchestrator: "Оркестратор",
  parser: "Парсер",
  matcher: "Поиск",
  "buyer-agent": "Закупка",
  "seller-agent": "Поставка",
  mandate: "Мандат",
  fulfillment: "Исполнение",
  ops: "Инциденты",
  human: "Человек",
  platform: "Арбитр",
};

function WhoBadge({ who }: { who: Actor }) {
  if (who === "both") {
    return (
      <span className="rounded-full border border-brass/40 bg-surface-2 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-paper">
        оба
      </span>
    );
  }
  if (who === "human") {
    return (
      <span className="rounded-full border border-terra bg-terra/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-terra">
        человек
      </span>
    );
  }
  return (
    <span className="rounded-full border border-brass bg-brass/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brass-2">
      агент
    </span>
  );
}

function railClass(who: Actor, on: boolean, done: boolean) {
  if (on) {
    return who === "human" ? "border-terra bg-terra/10" : who === "both" ? "border-brass/50 bg-surface-2" : "border-brass bg-brass/10";
  }
  if (done) return "border-line bg-surface-2/50";
  return "border-line";
}

function pickDeal(rooms: Deal[]): Deal | undefined {
  return [...rooms].filter((d) => d.status === "agreed").sort((a, b) => b.score - a.score)[0] ?? rooms[0];
}

function slidesOf(process: ProcessId): Slide[] {
  return SLIDES.filter((s) => s.process === process);
}

export default function DemoPage() {
  const {
    prepareShowcase,
    approveDeal,
    payAdvance,
    acceptDelivery,
    payRemainder,
    importAdaptedLots,
    returnLotsToShowcase,
    deals,
    orders,
    lots,
    resetDemo,
  } = useStore();

  const [processId, setProcessId] = useState<ProcessId>("vitrine");
  const [step, setStep] = useState(0);
  const [rfqId, setRfqId] = useState<string | null>(null);
  const [dealId, setDealId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [failRfqId, setFailRfqId] = useState<string | null>(null);
  const [failOrderId, setFailOrderId] = useState<string | null>(null);

  const slides = slidesOf(processId);
  const slide = slides[step] ?? slides[0];
  const deal = deals.find((d) => d.id === dealId);
  const order = orders.find((o) => o.id === orderId);
  const failOrder = orders.find((o) => o.id === failOrderId);
  const rooms = rfqId ? deals.filter((d) => d.rfqId === rfqId) : [];
  const failRooms = failRfqId ? deals.filter((d) => d.rfqId === failRfqId) : [];
  const last = step === slides.length - 1;
  const productId = deal?.productId ?? failOrder?.productId ?? KRAFT;
  const process = PROCESSES.find((p) => p.id === processId)!;

  const applyLeave = useCallback(
    (id: string) => {
      if (id === "gate" && dealId && !orderId) {
        const nextOrder = approveDeal(dealId);
        if (nextOrder) setOrderId(nextOrder);
      }
    },
    [approveDeal, dealId, orderId],
  );

  const startFail = useCallback(() => {
    const created = prepareShowcase(DEMO_QUERY);
    setFailRfqId(created.rfq.id);
    const best = pickDeal(created.deals);
    if (best) {
      const oid = approveDeal(best.id);
      if (oid) setFailOrderId(oid);
    }
  }, [approveDeal, prepareShowcase]);

  const applyEnter = useCallback(
    (id: string) => {
      if (id === "publish") {
        importAdaptedLots(ADAPTED_LOTS);
      }
      if (id === "parse" && !rfqId) {
        const created = prepareShowcase(DEMO_QUERY);
        setRfqId(created.rfq.id);
        setDealId(pickDeal(created.deals)?.id ?? null);
      }
      if (id === "writeoff" && orderId) {
        payAdvance(orderId);
        acceptDelivery(orderId);
        payRemainder(orderId);
      }
      if (id === "fail") {
        const existing = failOrderId ? orders.find((o) => o.id === failOrderId) : undefined;
        if (existing?.status === "advance_due") return;
        startFail();
      }
      if (id === "rollback" && failOrderId) {
        returnLotsToShowcase(failOrderId);
      }
    },
    [
      acceptDelivery,
      failOrderId,
      importAdaptedLots,
      orderId,
      orders,
      payAdvance,
      payRemainder,
      prepareShowcase,
      returnLotsToShowcase,
      rfqId,
      startFail,
    ],
  );

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= slides.length) return;
      if (next > step) {
        applyLeave(slides[step].id);
        applyEnter(slides[next].id);
      }
      setStep(next);
    },
    [applyEnter, applyLeave, slides, step],
  );

  const selectProcess = useCallback(
    (id: ProcessId) => {
      setProcessId(id);
      setStep(0);
      if (id === "deal") {
        setRfqId(null);
        setDealId(null);
        setOrderId(null);
      }
      if (id === "fail") {
        setFailRfqId(null);
        setFailOrderId(null);
        startFail();
        return;
      }
      applyEnter(slidesOf(id)[0].id);
    },
    [applyEnter, startFail],
  );

  function restart() {
    resetDemo();
    setRfqId(null);
    setDealId(null);
    setOrderId(null);
    setFailRfqId(null);
    setFailOrderId(null);
    setStep(0);
    if (processId === "fail") startFail();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!last) go(step + 1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(step - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, last, step]);

  const border =
    slide.who === "human" ? "border-terra/50" : slide.who === "both" ? "border-brass/40" : "border-brass/40";
  const noteTone = slide.who === "human" ? "text-terra" : slide.who === "both" ? "text-paper" : "text-brass-2";

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Демо · три процесса · слайды</p>
      <h1 className="mt-2 font-display text-5xl leading-tight">Витрина, сделка, откат</h1>
      <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted">
        Выберите процесс — «Далее» листает только его шаги. Латунь на кадре — агент, терракота — человек. Движок без
        Ollama.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {PROCESSES.map((proc) => {
          const on = proc.id === processId;
          return (
            <button
              key={proc.id}
              type="button"
              onClick={() => selectProcess(proc.id)}
              aria-current={on ? "page" : undefined}
              className={`rounded-full border px-3.5 py-2 text-[13px] ${
                on
                  ? "border-brass bg-brass/15 text-paper"
                  : "border-line text-muted hover:border-brass/40 hover:text-paper"
              }`}
            >
              <span className="font-mono text-[11px] uppercase tracking-wider text-brass">{proc.n}</span>
              <span className="ml-1.5">{proc.title}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
        <ol className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
          {slides.map((s, i) => {
            const on = i === step;
            const passed = i < step;
            const whoColor = s.who === "human" ? "text-terra" : "text-brass";
            const n = String(i + 1).padStart(2, "0");
            return (
              <li key={s.id} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  onClick={() => go(i)}
                  disabled={i > step}
                  className={`w-[11.5rem] border px-3 py-2.5 text-left lg:w-full ${railClass(s.who, on, passed)} disabled:cursor-default`}
                >
                  <p className={`font-mono text-[10px] uppercase tracking-widest ${on ? whoColor : "text-muted"}`}>
                    {n} · {s.who === "human" ? "человек" : s.who === "both" ? "оба" : "агент"}
                  </p>
                  <p className={`mt-1 font-display text-xl leading-tight ${on ? "text-paper" : "text-muted"}`}>{s.title}</p>
                </button>
              </li>
            );
          })}
        </ol>

        <section className={`min-h-[28rem] border bg-surface p-6 sm:p-8 ${border}`}>
          <div className="flex flex-wrap items-center gap-2">
            <WhoBadge who={slide.who} />
            <span className="font-mono text-[11px] text-muted">
              {process.n} · {String(step + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </span>
            <span className="flex flex-wrap gap-1.5">
              {slide.roles.map((id) => (
                <span
                  key={id}
                  className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                    id === "human" || id === "platform" ? "border-terra/40 text-terra" : "border-brass/40 text-brass-2"
                  }`}
                >
                  {ROLE_NAME[id] ?? id}
                </span>
              ))}
            </span>
          </div>
          <h2 className="mt-4 font-display text-4xl leading-tight">{slide.title}</h2>
          <p className={`mt-3 max-w-3xl text-[17px] leading-relaxed ${noteTone}`}>{slide.note}</p>

          <div className="mt-8">
            {slide.id === "csv" && <CsvBlock />}
            {slide.id === "skip" && <SkipBlock />}
            {slide.id === "publish" && <PublishBlock lots={lots} />}
            {slide.id === "need" && <NeedIntro />}
            {slide.id === "parse" && <NeedBlock />}
            {slide.id === "match" && <MatchBlock rooms={rooms} />}
            {slide.id === "talk" && deal && <TalkBlock deal={deal} />}
            {slide.id === "gate" && deal && <GateBlock deal={deal} />}
            {slide.id === "reserve" && (
              <StockBlock
                lots={lots}
                productId={productId}
                order={order}
                caption="После утверждения: qty тот же, вырос reserved, свободный остаток меньше."
              />
            )}
            {slide.id === "writeoff" && (
              <StockBlock
                lots={lots}
                productId={productId}
                order={order}
                caption="После оплаты остатка: qty уменьшен, резерв снят. Партия списана с витрины."
              />
            )}
            {slide.id === "fail" && (
              <StockBlock
                lots={lots}
                productId={failOrder?.productId ?? productId}
                order={failOrder}
                rooms={failRooms}
                caption="Сделка утверждена. Аванса нет — партии только в резерве."
              />
            )}
            {slide.id === "rollback" && (
              <StockBlock
                lots={lots}
                productId={failOrder?.productId ?? productId}
                order={failOrder}
                caption="Откат: reserved снят, свободный объём вернулся. Заказ отменён."
              />
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <button
              type="button"
              onClick={() => go(step - 1)}
              disabled={step === 0}
              className="rounded-full border border-line px-5 py-2.5 text-[14px] text-muted disabled:opacity-30"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={() => (last ? restart() : go(step + 1))}
              className="rounded-full bg-brass px-6 py-2.5 text-[14px] font-medium text-bg hover:bg-brass-2"
            >
              {last ? "С начала" : step === 0 ? "Начать" : "Далее"}
            </button>
            {step > 0 ? (
              <button type="button" onClick={restart} className="text-[13px] text-muted hover:text-paper">
                Сбросить
              </button>
            ) : null}
            <p className="ml-auto font-mono text-[11px] text-muted">← → или пробел</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function CsvBlock() {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">1С · Остатки складов</p>
      <pre className="mt-3 overflow-x-auto border border-dashed border-line bg-bg/40 px-4 py-3 font-mono text-[12px] leading-relaxed text-paper/90">
        {DEMO_1C_CSV.trim()}
      </pre>
    </div>
  );
}

function SkipBlock() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-brass">Приняты · {ADAPTED.ok.length}</p>
        <ul className="mt-3 space-y-2">
          {ADAPTED.ok.map((x) => (
            <li key={x.lot.id} className="border border-line px-4 py-3">
              <p className="font-display text-2xl">{x.productName}</p>
              <p className="mt-1 font-mono text-[12px] text-muted">
                {x.lot.batchNo} · {x.lot.qty} {x.lot.unit} · {x.lot.warehouse}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-terra">Отсев · {ADAPTED.skipped.length}</p>
        <ul className="mt-3 space-y-2">
          {ADAPTED.skipped.map((x) => (
            <li key={x.row.code || x.row.name} className="border border-terra/30 px-4 py-3">
              <p className="text-[15px] text-paper">{x.row.name || x.row.sku || "строка"}</p>
              {x.issues.map((issue) => (
                <p key={issue.code} className="mt-2 text-[13px] leading-relaxed text-muted">
                  {issue.fact}{" "}
                  <span className="font-mono text-[11px] text-terra">{SKIP_OWNER_LABEL[issue.owner]}</span>
                </p>
              ))}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PublishBlock({ lots }: { lots: Lot[] }) {
  const mine = lots.filter((l) => l.id.startsWith("lot-adapt-"));
  return (
    <div>
      <p className="text-[15px] text-paper">
        На витрине {mine.length || ADAPTED_LOTS.length} партий с адаптера. Повторная выгрузка не снимает чужие лоты.
      </p>
      <LotTable lots={mine.length ? mine : ADAPTED_LOTS} />
    </div>
  );
}

function NeedIntro() {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Фраза закупщика</p>
      <p className="mt-3 max-w-3xl font-display text-3xl leading-snug">«{DEMO_QUERY}»</p>
    </div>
  );
}

function NeedBlock() {
  const need = parseNeed(DEMO_QUERY);
  return (
    <div>
      <p className="text-[14px] text-paper">«{DEMO_QUERY}»</p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
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
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rooms.map((d) => {
        const p = productById(d.productId);
        const s = companyById(d.sellerId);
        return (
          <li key={d.id} className="border border-line px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <Badge tone={d.status === "agreed" ? "moss" : "live"}>{dealStatusLabel(d.status)}</Badge>
              <span className="font-mono text-[11px] text-muted">оценка {d.score}</span>
            </div>
            <p className="mt-3 font-display text-2xl">{s.short}</p>
            <p className="mt-1 text-[13px] text-muted">{p.name}</p>
            <p className="mt-2 font-mono text-[13px] text-brass">
              {rub(d.currentPrice)} / {p.unit} · {compactRub(d.currentPrice * d.qty)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function TalkBlock({ deal }: { deal: Deal }) {
  const buyer = companyById(deal.buyerId);
  const seller = companyById(deal.sellerId);
  return (
    <div>
      <p className="font-mono text-[11px] text-brass">
        {buyer.agent.name} ↔ {seller.agent.name}
      </p>
      <ol className="mt-4 space-y-3">
        {deal.messages.map((m) => (
          <li key={m.id} className="flex gap-3">
            {m.from === "system" ? (
              <p className="w-full border border-dashed border-line px-4 py-3 font-mono text-[13px] text-muted">{m.text}</p>
            ) : (
              <>
                <AgentMark name={m.from === "buyer-agent" ? buyer.agent.name : seller.agent.name} />
                <p className="text-[15px] leading-relaxed text-paper/90">{m.text}</p>
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
      <p className="text-[16px] leading-relaxed text-paper">
        {qty(deal.qty, p.unit)} × {rub(deal.currentPrice)} = {compactRub(deal.currentPrice * deal.qty)}. Предоплата{" "}
        {deal.prepayPct}%.
      </p>
      <p className="mt-4 text-[14px] text-muted">
        {companyById(deal.buyerId).short} · {companyById(deal.sellerId).short} · {p.name}
      </p>
    </div>
  );
}

function StockBlock({
  lots,
  productId,
  order,
  rooms,
  caption,
}: {
  lots: Lot[];
  productId: string;
  order?: Order;
  rooms?: Deal[];
  caption: string;
}) {
  const p = productById(productId);
  return (
    <div>
      {rooms && rooms.length > 0 ? (
        <p className="mb-4 text-[14px] text-muted">{rooms.length} комнаты по той же заявке. Утверждена лучшая.</p>
      ) : null}
      {order ? (
        <div className="mb-5">
          <Pipeline status={order.status} compact />
          <p className="mt-3 text-[14px] text-muted">
            {p.name} · {deliveryLine(order.incoterm, order.destination)} · {compactRub(order.total)}
          </p>
        </div>
      ) : null}
      <p className="text-[15px] leading-relaxed text-paper">{caption}</p>
      <LotTable lots={lotsForProduct(lots, productId)} />
    </div>
  );
}

function LotTable({ lots }: { lots: Lot[] }) {
  const rows = useMemo(() => {
    return [...lots]
      .sort((a, b) => {
        const aa = a.id.includes("adapt") ? 0 : 1;
        const bb = b.id.includes("adapt") ? 0 : 1;
        if (aa !== bb) return aa - bb;
        return b.reserved - a.reserved || freeQty(b) - freeQty(a);
      })
      .slice(0, 5);
  }, [lots]);
  const free = lots.reduce((s, l) => s + freeQty(l), 0);
  const reserved = lots.reduce((s, l) => s + l.reserved, 0);
  const onHand = lots.reduce((s, l) => s + l.qty, 0);
  if (rows.length === 0) {
    return <p className="mt-4 text-[14px] text-muted">Партий этой полки на витрине нет.</p>;
  }
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[28rem] text-left text-[13px]">
        <thead>
          <tr className="font-mono text-[10px] uppercase tracking-wider text-muted">
            <th className="pb-2 font-normal">Партия</th>
            <th className="pb-2 font-normal">Склад</th>
            <th className="pb-2 font-normal">qty</th>
            <th className="pb-2 font-normal">reserved</th>
            <th className="pb-2 font-normal">свободно</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.id} className="border-t border-line">
              <td className="py-2 font-mono text-[12px] text-brass">{l.batchNo}</td>
              <td className="py-2 text-muted">{l.warehouse}</td>
              <td className="py-2">{l.qty}</td>
              <td className="py-2">{l.reserved}</td>
              <td className="py-2">{freeQty(l)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 font-mono text-[12px] text-muted">
        итого qty {onHand} · резерв {reserved} · свободно {free}
      </p>
    </div>
  );
}

function Pair({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">{k}</dt>
      <dd className="mt-0.5 text-[15px]">{v}</dd>
    </div>
  );
}
