import { days, num, rub } from "./format";
import { isoOffset, uid } from "./ids";
import { allocateLots, freeQty, lotsForProduct } from "./inventory";
import { packCount, packLabel, packingOf, snapToPack } from "./packing";
import { parseNeed } from "./parse-need";
import { trustOf } from "./trust";
import { companies, lots as seedLots, products } from "./seed";
import type { Company, Deal, Message, Need, Offer, Product, Rfq } from "./types";

export { parseNeed };

function roundPrice(n: number): number {
  if (n >= 1000) return Math.round(n / 10) * 10;
  if (n >= 100) return Math.round(n);
  return Math.round(n * 100) / 100;
}

function concession(tone: Company["agent"]["tone"]): number {
  if (tone === "flexible") return 0.16;
  if (tone === "firm") return 0.07;
  return 0.04;
}

export function companyById(id: string): Company {
  const c = companies.find((x) => x.id === id);
  if (!c) throw new Error(`Company ${id} not found`);
  return c;
}

export function productById(id: string): Product {
  const p = products.find((x) => x.id === id);
  if (!p) throw new Error(`Product ${id} not found`);
  return p;
}

export function matchProducts(need: Need): { product: Product; score: number; reasons: string[] }[] {
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
      const available = lotsForProduct(seedLots, product.id).reduce((s, l) => s + freeQty(l), 0);
      if (available >= qty) {
        score += 10;
        reasons.push(`Свободно ${num(available)} ${product.unit} в партиях`);
      } else {
        score -= 20;
      }

      const pack = packingOf(product);
      reasons.push(`Кратность ${pack.packSize} ${product.unit} (${pack.packUnit})`);

      score += Math.round((seller.rating - 4) * 8);
      const ship = trustOf(seller.id).onTimeShipPct;
      if (ship >= 95) {
        score += 8;
        reasons.push(`On-time отгрузка ${ship}%`);
      } else if (ship < 90) {
        score -= 10;
        reasons.push(`Риск срыва срока: on-time ${ship}%`);
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

function askPrice(product: Product, qty: number): number {
  const tight = qty < product.moq * 2;
  return roundPrice(product.price * (tight ? 1.06 : 1));
}

export function createRfq(buyerId: string, query: string, parsed?: Need): { rfq: Rfq; deals: Deal[] } {
  const need = parsed ?? parseNeed(query);
  const buyer = companyById(buyerId);
  const now = new Date();
  const matches = matchProducts(need).slice(0, 3);
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
}): Deal {
  const { rfq, buyer, product, qty, matchReasons, now } = opts;
  const seller = companyById(product.sellerId);
  const list = product.price;
  const floor = floorPrice(product, seller, qty);
  const ask = askPrice(product, qty);
  const budgetCap = rfq.need.budget ? rfq.need.budget / qty : list * 0.98;
  const buyerTarget = rfq.need.budget ? Math.min(budgetCap * 0.92, ask * 0.9) : ask * 0.88;
  const counter = roundPrice(Math.max(buyerTarget, floor * 0.97));
  const payScore = trustOf(buyer.id).onTimePayPct;
  const riskPay = payScore < 85;
  const openingPrepay = riskPay ? 60 : 50;
  const wantPrepay = riskPay
    ? buyer.agent.priority === "price"
      ? 40
      : 50
    : buyer.agent.priority === "price"
      ? 30
      : 40;
  const deadline = rfq.need.deadlineDays ?? product.leadDays + 5;
  const destination = rfq.need.city || buyer.city;
  const incoterm = destination !== seller.city ? "DAP" : "FCA";
  const plan = allocateLots(seedLots, product.id, qty);
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
    `Агент «${buyer.agent.name}» направил RFQ поставщику ${seller.short}. Мандат покупателя: ${buyer.agent.mandate}`,
    1,
  );

  push(
    "seller-agent",
    `Агент «${seller.agent.name}»: по «${product.name}» собираем ${packLabel(qty, product)}. Партии: ${lotLine}. Предложение: ${rub(ask)}/${product.unit}, отгрузка ${days(leadDays)}, предоплата ${openingPrepay}%${
      riskPay ? ` (on-time оплаты покупателя ${payScore}% — поднимаем аванс)` : ""
    }, ${incoterm} ${incoterm === "DAP" ? destination : seller.city}.`,
    seller.agent.responseMin,
  );
  offers.push({
    id: uid("off"),
    from: "seller",
    price: ask,
    qty,
    leadDays,
    prepayPct: openingPrepay,
    terms: `${incoterm} ${incoterm === "DAP" ? destination : seller.city}`,
    at: isoOffset(now, t),
  });

  push(
    "buyer-agent",
    `Агент «${buyer.agent.name}»: ${
      rfq.need.budget ? `бюджет заявки ${rub(rfq.need.budget)}.` : "идём от рынка."
    } Контр: ${rub(counter)}/${product.unit}, предоплата ${wantPrepay}%${
      rfq.need.city ? `, поставка в ${rfq.need.city}` : ""
    }. ${buyer.agent.priority === "speed" ? "Срок критичен — готов закрыть быстрее дороже." : "Есть конкурирующие RFQ, цена решающая."}`,
    buyer.agent.responseMin,
  );
  offers.push({
    id: uid("off"),
    from: "buyer",
    price: counter,
    qty,
    leadDays,
    prepayPct: wantPrepay,
    terms: rfq.need.city ? `поставка ${rfq.need.city}` : "FCA",
    at: isoOffset(now, t),
  });

  let status: Deal["status"] = "countering";
  let current = ask;
  let prepay = openingPrepay;
  const finalLead = leadDays;

  if (counter >= floor) {
    const mid = roundPrice((ask + Math.max(counter, floor)) / 2);
    const concede = seller.agent.tone === "premium" ? roundPrice(Math.max(floor * 1.04, ask * 0.97)) : mid;
    const sellerStep = roundPrice(Math.max(floor, concede));
    current = sellerStep;
    prepay = seller.agent.tone === "premium" ? openingPrepay : Math.max(wantPrepay, riskPay ? 50 : 40);
    if (rfq.need.city && seller.agent.tone !== "firm") {
      push(
        "seller-agent",
        `Агент «${seller.agent.name}»: доставку до ${rfq.need.city} берём. Могу ${rub(sellerStep)} при предоплате ${prepay}%. Пол мандата — ${rub(floor)}. Это край уступки.`,
        seller.agent.responseMin,
      );
    } else {
      push(
        "seller-agent",
        `Агент «${seller.agent.name}»: ${rub(counter)} ниже комфортной зоны. Фиксирую ${rub(sellerStep)}, предоплата ${prepay}%. Ниже ${rub(floor)} — ломаем маржу ${seller.agent.minMarginPct}%.`,
        seller.agent.responseMin,
      );
    }
    offers.push({
      id: uid("off"),
      from: "seller",
      price: sellerStep,
      qty,
      leadDays: finalLead,
      prepayPct: prepay,
      terms: rfq.need.city ? `доставка ${rfq.need.city}` : `FCA ${seller.city}`,
      at: isoOffset(now, t),
    });

    if (sellerStep <= budgetCap * 1.02) {
      status = "agreed";
      current = sellerStep;
      push(
        "buyer-agent",
        `Агент «${buyer.agent.name}»: ${rub(sellerStep)} в мандате${
          rfq.need.budget ? ` (потолок ${rub(budgetCap)}/${product.unit})` : ""
        }. Срок ${days(finalLead)} принимаем. Акцепт, ждём счёт.`,
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
        `Агент «${buyer.agent.name}»: ${rub(sellerStep)} выше потолка ${rub(budgetCap)}. Мандат не пускает. Оставляем заявку открытой на случай новой уступки.`,
        buyer.agent.responseMin,
      );
      push("system", "Не сошлись по цене: потолок покупателя ниже последнего шага продавца.", 1);
      status = "rejected";
    }
  } else {
    const last = roundPrice(floor * 1.01);
    current = last;
    push(
      "seller-agent",
      `Агент «${seller.agent.name}»: ${rub(counter)} ниже пола ${rub(floor)} (мандат: маржа ≥ ${seller.agent.minMarginPct}%). Край: ${rub(last)}, предоплата 50%. Дальше — только человек.`,
      seller.agent.responseMin,
    );
    offers.push({
      id: uid("off"),
      from: "seller",
      price: last,
      qty,
      leadDays: finalLead,
      prepayPct: 50,
      terms: `FCA ${seller.city}`,
      at: isoOffset(now, t),
    });

    if (last <= budgetCap * 1.03 && buyer.agent.tone !== "firm") {
      status = "agreed";
      current = last;
      prepay = 50;
      push(
        "buyer-agent",
        `Агент «${buyer.agent.name}»: на пределе, но срок и наличие важнее. Берём ${rub(last)}.`,
        buyer.agent.responseMin,
      );
      push(
        "system",
        `Стороны сошлись на пределе мандатов: ${num(qty)}\u00a0${product.unit} × ${rub(current)}. Нужно утверждение.`,
        1,
      );
    } else {
      status = "rejected";
      push(
        "buyer-agent",
        `Агент «${buyer.agent.name}»: даже край ${rub(last)} не проходит в бюджет. Снимаем этого поставщика.`,
        buyer.agent.responseMin,
      );
      push("system", "Сделка сорвана: цена продавца не входит в мандат покупателя.", 1);
    }
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
  };
}
