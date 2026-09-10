import { days, deliveryLine, num, rub } from "./format";
import { isoOffset, uid } from "./ids";
import { allocateLots, freeQty, lotsForProduct } from "./inventory";
import { packCount, packLabel, packingOf, snapToPack } from "./packing";
import { parseNeed } from "./parse-need";
import { trustOf } from "./trust";
import { roundPrice, runBargain, tacticLabel, tacticOf, withTactic } from "./bargain";
import { companies, lots as seedLots, products } from "./seed";
import type { BargainTactic, Company, Deal, Lot, Message, Need, Offer, Product, Rfq, TrustScore } from "./types";

export { parseNeed };

function concession(tone: Company["agent"]["tone"]): number {
  if (tone === "flexible") return 0.16;
  if (tone === "firm") return 0.07;
  return 0.04;
}

export function companyById(id: string, tactics?: Record<string, BargainTactic>): Company {
  const c = companies.find((x) => x.id === id);
  if (!c) throw new Error(`Company ${id} not found`);
  return withTactic(c, tactics);
}

export function productById(id: string): Product {
  const p = products.find((x) => x.id === id);
  if (!p) throw new Error(`Product ${id} not found`);
  return p;
}

export function matchProducts(
  need: Need,
  reputations?: Record<string, TrustScore>,
  lots: Lot[] = seedLots,
): { product: Product; score: number; reasons: string[] }[] {
  const keys = [...need.keywords, ...(need.query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3))];
  const unique = Array.from(new Set(keys));

  return products
    .filter((product) => !need.category || product.category === need.category)
    .map((product) => {
      const seller = companyById(product.sellerId);
      const blob = `${product.name} ${product.category} ${product.tags.join(" ")} ${product.description}`.toLowerCase();
      let score = 0;
      const reasons: string[] = [];

      if (need.category && product.category === need.category) {
        score += 40;
        reasons.push(`Категория «${product.category}»`);
      }

      let hits = 0;
      for (const k of unique) {
        if (k.length < 3) continue;
        if (blob.includes(k.toLowerCase()) || product.tags.some((t) => t.includes(k))) hits += 1;
      }
      score += Math.min(30, hits * 6);
      if (hits >= 2) reasons.push("Совпадение по спецификации");

      if (need.city && seller.city === need.city) {
        score += 16;
        reasons.push(`Площадка в ${seller.city}`);
      } else if (need.city) {
        score += 4;
      }

      if (need.unit && product.unit !== need.unit) {
        score -= 16;
      }

      if (need.deadlineDays && product.leadDays <= need.deadlineDays) {
        score += 14;
        reasons.push(`Срок ${days(product.leadDays)} внутри графика`);
      } else if (need.deadlineDays && product.leadDays > need.deadlineDays) {
        score -= 12;
        reasons.push(`Срок ${days(product.leadDays)} длиннее запроса`);
      }

      const qty = need.qty ?? product.moq * 8;
      const available = lotsForProduct(lots, product.id).reduce((s, l) => s + freeQty(l), 0);
      if (available >= qty) {
        score += 10;
        reasons.push(`Свободно ${num(available)} ${product.unit} в партиях`);
      } else {
        score -= 20;
      }

      const pack = packingOf(product);
      reasons.push(`Кратность ${pack.packSize} ${product.unit} (${pack.packUnit})`);

      score += Math.round((seller.rating - 4) * 8);
      const ship = trustOf(seller.id, reputations).onTimeShipPct;
      if (ship >= 95) {
        score += 8;
        reasons.push(`Отгрузки в срок: ${ship}%`);
      } else if (ship < 90) {
        score -= 10;
        reasons.push(`Риск срыва срока: отгрузки в срок ${ship}%`);
      }
      if (reasons.length === 0) reasons.push("Частичное совпадение");

      return { product, score, reasons };
    })
    .filter((x) => x.score >= 28)
    .sort((a, b) => b.score - a.score);
}

function floorPrice(product: Product, seller: Company, qty: number): number {
  const vol = qty >= product.moq * 20 ? 0.05 : qty >= product.moq * 8 ? 0.025 : 0;
  return roundPrice(product.price * (1 - concession(seller.agent.tone) - vol));
}

export function createRfq(
  buyerId: string,
  query: string,
  parsed?: Need,
  reputations?: Record<string, TrustScore>,
  lots: Lot[] = seedLots,
  tactics?: Record<string, BargainTactic>,
): { rfq: Rfq; deals: Deal[] } {
  const need = parsed ?? parseNeed(query);
  const buyer = companyById(buyerId, tactics);
  const now = new Date();
  const matches = matchProducts(need, reputations, lots).slice(0, 3);
  const rfqId = uid("rfq");
  const rawQty = need.qty ?? Math.max(matches[0]?.product.moq ?? 1, Math.round((matches[0]?.product.moq ?? 1) * 8));
  const qty = matches[0] ? snapToPack(rawQty, matches[0].product) : rawQty;

  const rfq: Rfq = {
    id: rfqId,
    buyerId,
    createdAt: now.toISOString(),
    need: { ...need, qty },
    status: matches.length ? "negotiating" : "closed",
  };

  const deals = matches.map((m, i) =>
    negotiate({
      rfq,
      buyer,
      product: m.product,
      qty,
      matchReasons: m.reasons,
      stagger: i * 400,
      now,
      reputations,
      lots,
      tactics,
    }),
  );

  if (deals.some((d) => d.status === "agreed")) {
    const best = [...deals].filter((d) => d.status === "agreed").sort((a, b) => b.score - a.score)[0];
    if (best) {
      rfq.awardedDealId = best.id;
      rfq.status = "awarded";
    }
  }

  return { rfq, deals };
}

function negotiate(opts: {
  rfq: Rfq;
  buyer: Company;
  product: Product;
  qty: number;
  matchReasons: string[];
  stagger: number;
  now: Date;
  reputations?: Record<string, TrustScore>;
  lots?: Lot[];
  tactics?: Record<string, BargainTactic>;
}): Deal {
  const { rfq, buyer, product, qty, matchReasons, now, reputations, lots = seedLots } = opts;
  const seller = companyById(product.sellerId, opts.tactics);
  const list = product.price;
  const floor = floorPrice(product, seller, qty);
  const budgetCap = rfq.need.budget ? rfq.need.budget / qty : list * 0.98;
  const buyerTactic = tacticOf(buyer, opts.tactics);
  const sellerTactic = tacticOf(seller, opts.tactics);
  const payScore = trustOf(buyer.id, reputations).onTimePayPct;
  const riskPay = payScore < 85;
  const openingPrepay = riskPay ? 60 : sellerTactic === "firm" ? 50 : 45;
  const wantPrepay = riskPay ? 50 : buyerTactic === "firm" ? 35 : buyerTactic === "fast" ? 40 : 30;
  const deadline = rfq.need.deadlineDays ?? product.leadDays + 5;
  const destination = rfq.need.city || buyer.city;
  const incoterm = destination !== seller.city ? "DAP" : "FCA";
  const plan = allocateLots(lots, product.id, qty);
  const lotLine = plan.allocations.length
    ? plan.allocations.map((a) => `${a.batchNo} · ${num(a.qty)}\u00a0${product.unit} · ${a.warehouse}`).join("; ")
    : "слот производства";
  const reasons = [
    ...matchReasons,
    packLabel(qty, product),
    plan.ok ? `Партии: ${plan.allocations.map((a) => a.batchNo).join(", ")}` : "Не хватает свободных партий",
  ];

  const leadOk = product.leadDays <= deadline;
  const leadDays = Math.max(product.leadDays, plan.leadDays);
  const terms = rfq.need.city ? `доставка ${rfq.need.city}` : deliveryLine("FCA", seller.city);

  const bargain = runBargain({
    list,
    floor,
    cap: budgetCap,
    sellerTactic,
    buyerTactic,
    openingPrepay,
    wantPrepay,
  });

  const messages: Message[] = [];
  const offers: Offer[] = [];
  let t = 0;
  const push = (from: Message["from"], text: string, addMin: number) => {
    t += addMin;
    messages.push({
      id: uid("msg"),
      at: isoOffset(now, t),
      delayMs: 900 + addMin * 80 + opts.stagger,
      from,
      text,
    });
  };

  push(
    "system",
    `Агент «${buyer.agent.name}» направил запрос поставщику ${seller.short} по «${product.name}». Тактика закупки — ${tacticLabel(buyerTactic)}, поставки — ${tacticLabel(sellerTactic)}.`,
    1,
  );

  bargain.ticks.forEach((tick, i) => {
    const from = tick.from === "seller" ? "seller-agent" : "buyer-agent";
    const name = tick.from === "seller" ? seller.agent.name : buyer.agent.name;
    const wait = tick.from === "seller" ? seller.agent.responseMin : buyer.agent.responseMin;
    if (i === 0) {
      push(
        from,
        `Агент «${name}»: по «${product.name}» собираем ${packLabel(qty, product)}. Партии: ${lotLine}. Предложение: ${rub(tick.price)}/${product.unit}, отгрузка ${days(leadDays)}, предоплата ${tick.prepayPct}%${
          riskPay ? ` (оплаты покупателя в срок ${payScore}% — поднимаем аванс)` : ""
        }, ${deliveryLine(incoterm, incoterm === "DAP" ? destination : seller.city)}.`,
        wait,
      );
    } else if (i === 1) {
      push(
        from,
        `Агент «${name}»: встречное ${rub(tick.price)}/${product.unit}, предоплата ${tick.prepayPct}%${
          rfq.need.city ? `, поставка в ${rfq.need.city}` : ""
        }.`,
        wait,
      );
    } else if (tick.from === "seller") {
      push(from, `Агент «${name}»: могу ${rub(tick.price)} при предоплате ${tick.prepayPct}%.`, wait);
    } else {
      push(from, `Агент «${name}»: поднимаем встречное до ${rub(tick.price)}, предоплата ${tick.prepayPct}%.`, wait);
    }
    offers.push({
      id: uid("off"),
      from: tick.from,
      price: tick.price,
      qty,
      leadDays,
      prepayPct: tick.prepayPct,
      terms,
      at: isoOffset(now, t),
    });
  });

  const current = bargain.price;
  const prepay = bargain.prepayPct;
  const finalLead = leadDays;
  let status: Deal["status"] = bargain.agreed ? "agreed" : "rejected";

  if (bargain.agreed) {
    push(
      "buyer-agent",
      `Агент «${buyer.agent.name}»: ${rub(current)} проходит. Срок ${days(finalLead)} принимаем. Акцепт, ждём счёт.`,
      buyer.agent.responseMin,
    );
    push(
      "system",
      `Стороны сошлись: ${num(qty)}\u00a0${product.unit} × ${rub(current)}, ${days(finalLead)}, предоплата ${prepay}%. Нужно утверждение закупщика.`,
      1,
    );
  } else {
    push(
      "buyer-agent",
      `Агент «${buyer.agent.name}»: последнее ${rub(current)} не проходит в наш мандат. Снимаем этого поставщика.`,
      buyer.agent.responseMin,
    );
    push("system", "Не сошлись: оферта продавца выше мандата закупки.", 1);
  }

  const priceScore = Math.max(0, 40 - ((current - floor) / (list || 1)) * 80);
  const leadScore = leadOk ? 20 : 0;
  const cityScore = rfq.need.city === seller.city ? 12 : 4;
  const statusScore = status === "agreed" ? 25 : status === "rejected" ? 0 : 8;
  const score = Math.round(
    Math.min(99, priceScore + leadScore + cityScore + statusScore + seller.rating * 4),
  );

  return {
    id: uid("deal"),
    rfqId: rfq.id,
    buyerId: buyer.id,
    sellerId: seller.id,
    productId: product.id,
    qty,
    status,
    messages,
    offers,
    listPrice: list,
    floorPrice: floor,
    currentPrice: current,
    leadDays: finalLead,
    prepayPct: prepay,
    incoterm,
    destination,
    packCount: packCount(qty, product),
    score,
    playback: true,
    matchReasons: reasons,
    buyerTactic,
    sellerTactic,
  };
}
