import type { BargainFail, BargainTactic, Company } from "./types";

export const BARGAIN_TACTICS: {
  id: BargainTactic;
  label: string;
  blurb: string;
}[] = [
  {
    id: "market",
    label: "Рынок",
    blurb: "Открыться далеко от своего края. Два круга уступок. Сойтись или разойтись.",
  },
  {
    id: "firm",
    label: "Жёсткий край",
    blurb: "Мало уступать в цене. Держать аванс. Если отрезок пустой — разойтись.",
  },
  {
    id: "fast",
    label: "Быстрый сход",
    blurb: "Короткий шаг к середине. Срок и закрытие важнее торга.",
  },
];

export function tacticLabel(id?: BargainTactic): string {
  return BARGAIN_TACTICS.find((t) => t.id === id)?.label ?? "Рынок";
}

export function tacticOf(company: Company, overlay?: Record<string, BargainTactic>): BargainTactic {
  return overlay?.[company.id] ?? company.agent.tactic ?? "market";
}

export function withTactic(company: Company, overlay?: Record<string, BargainTactic>): Company {
  return { ...company, agent: { ...company.agent, tactic: tacticOf(company, overlay) } };
}

type Spec = { askMult: number; bidFrac: number; concede: number; steps: number };

const SPEC: Record<BargainTactic, Spec> = {
  market: { askMult: 1.06, bidFrac: 0.8, concede: 0.45, steps: 2 },
  firm: { askMult: 1.03, bidFrac: 0.92, concede: 0.12, steps: 1 },
  fast: { askMult: 1.02, bidFrac: 0.94, concede: 0.62, steps: 1 },
};

export function roundPrice(n: number): number {
  if (n >= 1000) return Math.round(n / 10) * 10;
  if (n >= 100) return Math.round(n);
  return Math.round(n * 100) / 100;
}

export interface BargainTick {
  from: "seller" | "buyer";
  price: number;
  prepayPct: number;
}

export function runBargain(opts: {
  list: number;
  floor: number;
  cap: number;
  sellerTactic: BargainTactic;
  buyerTactic: BargainTactic;
  openingPrepay: number;
  wantPrepay: number;
}): { ticks: BargainTick[]; agreed: boolean; price: number; prepayPct: number; fail?: BargainFail } {
  const sell = SPEC[opts.sellerTactic];
  const buy = SPEC[opts.buyerTactic];
  const floor = Math.min(opts.floor, opts.list);
  const cap = opts.cap;
  const floorAboveCap = floor > cap + 0.001;

  let ask = roundPrice(Math.max(floor, opts.list * sell.askMult));
  let bid = roundPrice(Math.min(cap, ask * buy.bidFrac));
  if (bid > ask) bid = roundPrice(Math.min(cap, ask * 0.97));

  let sellerPrepay = opts.openingPrepay;
  const ticks: BargainTick[] = [
    { from: "seller", price: ask, prepayPct: sellerPrepay },
    { from: "buyer", price: bid, prepayPct: opts.wantPrepay },
  ];

  const close = (price: number, prepayPct: number) => ({
    ticks,
    agreed: true as const,
    price: roundPrice(price),
    prepayPct,
  });
  const fail = (reason: BargainFail, price: number, prepayPct: number) => ({
    ticks,
    agreed: false as const,
    price: roundPrice(price),
    prepayPct,
    fail: reason,
  });

  if (!floorAboveCap && bid + 0.001 >= ask && ask <= cap) return close(ask, sellerPrepay);

  const steps = Math.max(sell.steps, buy.steps);
  for (let i = 0; i < steps; i += 1) {
    if (i < sell.steps) {
      const next = roundPrice(Math.max(floor, ask - (ask - bid) * sell.concede));
      if (opts.sellerTactic === "fast") sellerPrepay = Math.min(sellerPrepay, Math.max(opts.wantPrepay, 40));
      ask = next;
      ticks.push({ from: "seller", price: ask, prepayPct: sellerPrepay });
      if (!floorAboveCap && ask <= cap) return close(ask, sellerPrepay);
    }
    if (i < buy.steps) {
      bid = roundPrice(Math.min(cap, bid + (ask - bid) * buy.concede));
      ticks.push({ from: "buyer", price: bid, prepayPct: opts.wantPrepay });
      if (!floorAboveCap && bid + 0.001 >= ask && ask <= cap) return close(ask, sellerPrepay);
    }
  }

  if (!floorAboveCap && ask <= cap) return close(ask, sellerPrepay);
  if (!floorAboveCap && opts.sellerTactic !== "firm") {
    ask = roundPrice(Math.max(floor, Math.min(ask, cap)));
    ticks.push({ from: "seller", price: ask, prepayPct: sellerPrepay });
    return close(ask, sellerPrepay);
  }
  if (!floorAboveCap && ask > 0 && (ask - cap) / ask < 0.05) {
    ask = roundPrice(Math.max(floor, cap));
    ticks.push({ from: "seller", price: ask, prepayPct: sellerPrepay });
    if (ask <= cap) return close(ask, sellerPrepay);
  }
  if (floorAboveCap) return fail("floor_above_cap", ask, sellerPrepay);
  if (opts.sellerTactic === "firm") return fail("seller_held", ask, sellerPrepay);
  return fail("no_overlap", ask, sellerPrepay);
}

export function bargainFailCopy(fail: BargainFail): { fact: string; nextStep: string } {
  if (fail === "item_mismatch") {
    return {
      fact: "Спецификация позиции не закрывает заявку. Агент закупки не торгует этот предмет.",
      nextStep: "Человек может снять позицию или сознательно принять предмет и тогда откроется торг.",
    };
  }
  if (fail === "floor_above_cap") {
    return {
      fact: "Потолок покупателя ниже края продавца. Стороны разошлись — сделка не состоялась.",
      nextStep: "Закупщик может открыть заявку другому поставщику.",
    };
  }
  if (fail === "seller_held") {
    return {
      fact: "Продавец не уступил до потолка. Стороны разошлись — сделка не состоялась.",
      nextStep: "Либо новый запрос с другим мандатом, либо другой поставщик.",
    };
  }
  return {
    fact: "Мандаты не пересеклись. Стороны разошлись — сделка не состоялась.",
    nextStep: "Закупщик может открыть заявку другому поставщику.",
  };
}
