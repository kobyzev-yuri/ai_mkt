import { bargainFailCopy, roundPrice, runBargain, tacticOf } from "./bargain";
import { days, deliveryLine, num, rub } from "./format";
import { isoOffset, uid } from "./ids";
import { allocateLots, freeQty, lotsForProduct } from "./inventory";
import { packCount, packLabel, packingOf, snapToPack } from "./packing";
import { parseNeed } from "./parse-need";
import { specFit } from "./spec-fit";
import { trustOf } from "./trust";
import { allCompanies } from "./roster";
import { lots as seedLots, products } from "./seed";
import type { Company, Deal, Message, Need, Offer, Product, Rfq, TrustScore } from "./types";

export { parseNeed };

function concession(tone: Company["agent"]["tone"]): number {
  if (tone === "flexible") return 0.16;
  if (tone === "firm") return 0.07;
  return 0.04;
}

export function companyById(id: string): Company {
  const c = allCompanies().find((x) => x.id === id);
  if (!c) throw new Error(`Company ${id} not found`);
  return c;
}

export function productById(id: string): Product {
  const p = products.find((x) => x.id === id);
  if (!p) throw new Error(`Product ${id} not found`);
  return p;
}

export function matchProducts(
  need: Need,
  reputations?: Record<string, TrustScore>,
): { product: Product; score: number; reasons: string[] }[] {
  const keys = [...need.keywords, ...(need.query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3))];
  const unique = Array.from(new Set(keys));

  return products
    .filter((product) => !need.category || product.category === need.category)
    .map((product) => {
      const seller = companyById(product.sellerId);
      const blob = `${product.name} ${product.category} ${product.tags.join(" ")} ${product.description} ${Object.values(product.specs).join(" ")}`.toLowerCase();
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
      if (hits >= 2) reasons.push("Совпадение по словам заявки");

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
): { rfq: Rfq; deals: Deal[] } {
  const need = parsed ?? parseNeed(query);
  const buyer = companyById(buyerId);
  const now = new Date();
  const matches = matchProducts(need, reputations).slice(0, 3);
  const rfqId = uid("rfq");
  const rawQty = need.qty ?? Math.max(matches[0]?.product.moq ?? 1, Math.round((matches[0]?.product.moq ?? 1) * 8));

  const rfq: Rfq = {
    id: rfqId,
    buyerId,
    createdAt: now.toISOString(),
    need: { ...need, qty: matches[0] ? snapToPack(rawQty, matches[0].product) : rawQty },
    status: matches.length ? "negotiating" : "closed",
  };

  const deals = matches.map((m, i) =>
    negotiate({
      rfq,
      buyer,
      product: m.product,
      qty: snapToPack(rawQty, m.product),
      matchReasons: m.reasons,
      stagger: i * 400,
      now,
      reputations,
    }),
  );

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
  forceBargain?: boolean;
  keepId?: string;
  priorMessages?: Message[];
  playback?: boolean;
}): Deal {
  const { rfq, buyer, product, qty, matchReasons, now, reputations } = opts;
  const seller = companyById(product.sellerId);
  const list = product.price;
  const floor = floorPrice(product, seller, qty);
  const budgetCap = rfq.need.budget ? rfq.need.budget / qty : list * 0.98;
  const payScore = trustOf(buyer.id, reputations).onTimePayPct;
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
  const spec = specFit(rfq.need, product);
  const reasons = [
    ...matchReasons,
    packLabel(qty, product),
    plan.ok ? `Партии: ${plan.allocations.map((a) => a.batchNo).join(", ")}` : "Не хватает свободных партий",
    ...spec.hits,
    ...spec.gaps,
    ...spec.clashes,
  ];

  const leadOk = product.leadDays <= deadline;
  const leadDays = Math.max(product.leadDays, plan.leadDays);
  const shipTerms = deliveryLine(incoterm, incoterm === "DAP" ? destination : seller.city);
  const messages: Message[] = [...(opts.priorMessages ?? [])];
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

  const withSpec = (deal: Omit<Deal, "specFit" | "specHits" | "specGaps" | "specClashes" | "specAccepted">): Deal => ({
    ...deal,
    specFit: spec.fit,
    specHits: spec.hits,
    specGaps: spec.gaps,
    specClashes: spec.clashes,
    specAccepted: Boolean(opts.forceBargain && spec.fit !== "match"),
  });

  if (spec.fit !== "match" && !opts.forceBargain) {
    push(
      "system",
      `Подбор нашёл «${product.name}». Агент «${buyer.agent.name}» сверяет заявку с технической спецификацией карточки — до этого торга нет.`,
      1,
    );
    const covered = spec.hits.length ? spec.hits.join("; ") : "точных попаданий по спеке нет";
    const missing = [...spec.clashes, ...spec.gaps].join("; ");
    push(
      "buyer-agent",
      spec.fit === "mismatch"
        ? `Агент «${buyer.agent.name}»: спецификация противоречит заявке. ${missing}. Закрывает: ${covered}. Без человека этот предмет не торгую.`
        : `Агент «${buyer.agent.name}»: спецификация не закрывает заявку целиком. Есть: ${covered}. Не закрыто: ${missing}. Нужен человек — подтвердить предмет или снять.`,
      buyer.agent.responseMin,
    );
    push("system", bargainFailCopy("item_mismatch").fact, 1);
    return withSpec({
      id: opts.keepId ?? uid("deal"),
      rfqId: rfq.id,
      buyerId: buyer.id,
      sellerId: seller.id,
      productId: product.id,
      qty,
      status: "open",
      messages,
      offers,
      listPrice: list,
      floorPrice: floor,
      currentPrice: list,
      leadDays,
      prepayPct: openingPrepay,
      incoterm,
      destination,
      packCount: packCount(qty, product),
      score: Math.round(Math.min(70, 20 + seller.rating * 4)),
      playback: opts.playback ?? true,
      matchReasons: reasons,
      rejectReason: "item_mismatch",
    });
  }

  const bargain = runBargain({
    list,
    floor,
    cap: budgetCap,
    sellerTactic: tacticOf(seller),
    buyerTactic: tacticOf(buyer),
    openingPrepay,
    wantPrepay,
  });

  if (opts.forceBargain && spec.fit !== "match") {
    push(
      "system",
      `Человек принял предмет «${product.name}» при неполной спецификации. Агенты открывают торг в мандате.`,
      1,
    );
  } else {
    push(
      "system",
      `Агент «${buyer.agent.name}» сверил спецификацию: заявка закрыта. Запрос поставщику ${seller.short}.${
        rfq.need.budget ? ` Потолок заявки ${rub(budgetCap)}/${product.unit}.` : ""
      }`,
      1,
    );
  }

  const finalLead = leadDays;
  bargain.ticks.forEach((tick, i) => {
    const agent = tick.from === "seller" ? seller.agent.name : buyer.agent.name;
    const wait = tick.from === "seller" ? seller.agent.responseMin : buyer.agent.responseMin;
    if (i === 0 && tick.from === "seller") {
      push(
        "seller-agent",
        `Агент «${seller.agent.name}»: по «${product.name}» собираем ${packLabel(qty, product)}. Партии: ${lotLine}. Предложение: ${rub(tick.price)}/${product.unit}, отгрузка ${days(leadDays)}, предоплата ${tick.prepayPct}%${
          riskPay ? ` (оплаты покупателя в срок ${payScore}% — поднимаем аванс)` : ""
        }, ${shipTerms}.`,
        wait,
      );
    } else if (tick.from === "buyer") {
      push(
        "buyer-agent",
        `Агент «${agent}»: ${
          rfq.need.budget ? `бюджет заявки ${rub(rfq.need.budget)}.` : "идём от рынка."
        } Встречное: ${rub(tick.price)}/${product.unit}, предоплата ${tick.prepayPct}%${
          rfq.need.city ? `, поставка в ${rfq.need.city}` : ""
        }. ${buyer.agent.priority === "speed" ? "Срок критичен — готов закрыть быстрее дороже." : "Есть конкурирующие заявки, цена решающая."}`,
        wait,
      );
    } else {
      push(
        "seller-agent",
        `Агент «${agent}»: ${
          rfq.need.city && seller.agent.tone !== "firm" ? `доставку до ${rfq.need.city} берём. ` : ""
        }Могу ${rub(tick.price)} при предоплате ${tick.prepayPct}%. Это край уступки в этом круге.`,
        wait,
      );
    }
    offers.push({
      id: uid("off"),
      from: tick.from,
      price: tick.price,
      qty,
      leadDays: finalLead,
      prepayPct: tick.prepayPct,
      terms: tick.from === "buyer" && rfq.need.city ? `поставка ${rfq.need.city}` : shipTerms,
      at: isoOffset(now, t),
    });
  });

  const current = bargain.price;
  const prepay = bargain.prepayPct;
  const status: Deal["status"] = bargain.agreed ? "agreed" : "rejected";

  if (bargain.agreed) {
    push(
      "buyer-agent",
      `Агент «${buyer.agent.name}»: ${rub(current)} в мандате${
        rfq.need.budget ? ` (потолок ${rub(budgetCap)}/${product.unit})` : ""
      }. Срок ${days(finalLead)} принимаем. Акцепт, ждём счёт.`,
      buyer.agent.responseMin,
    );
    push(
      "system",
      `Стороны сошлись: ${num(qty)}\u00a0${product.unit} × ${rub(current)}, ${days(finalLead)}, предоплата ${prepay}%. Нужно утверждение человека — агенты сделку не закрывают.`,
      1,
    );
  } else {
    const copy = bargainFailCopy(bargain.fail ?? "no_overlap");
    push(
      "buyer-agent",
      `Агент «${buyer.agent.name}»: ${rub(current)} не проходит в мандат. Снимаем этого поставщика.`,
      buyer.agent.responseMin,
    );
    push("system", copy.fact, 1);
  }

  const priceScore = Math.max(0, 40 - ((current - floor) / (list || 1)) * 80);
  const leadScore = leadOk ? 20 : 0;
  const cityScore = rfq.need.city === seller.city ? 12 : 4;
  const statusScore = status === "agreed" ? 25 : status === "rejected" ? 0 : 8;
  const score = Math.round(
    Math.min(99, priceScore + leadScore + cityScore + statusScore + seller.rating * 4),
  );

  return withSpec({
    id: opts.keepId ?? uid("deal"),
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
    playback: opts.playback ?? true,
    matchReasons: reasons,
    rejectReason: bargain.agreed ? undefined : bargain.fail,
  });
}

export function acceptSpecAndBargain(deal: Deal, rfq: Rfq, reputations?: Record<string, TrustScore>): Deal {
  return negotiate({
    rfq,
    buyer: companyById(deal.buyerId),
    product: productById(deal.productId),
    qty: deal.qty,
    matchReasons: deal.matchReasons,
    stagger: 0,
    now: new Date(),
    reputations,
    forceBargain: true,
    keepId: deal.id,
    priorMessages: deal.messages,
    playback: false,
  });
}
