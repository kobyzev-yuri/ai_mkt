import { companyById, productById } from "./agents";
import { days, num, rub } from "./format";
import { isoOffset, uid } from "./ids";
import { allocateLots } from "./inventory";
import { packCount, packLabel, packingOf } from "./packing";
import type { Deal, Invoice, Lot, Order, ProcessEvent, Rfq, Shipment, TradeDocument } from "./types";

export const ORDER_STAGES = [
  { id: "agree", label: "Согласование" },
  { id: "advance", label: "Предоплата" },
  { id: "reserve", label: "Резерв партий" },
  { id: "pick", label: "Комплектация" },
  { id: "ship", label: "Отгрузка" },
  { id: "transit", label: "В пути" },
  { id: "accept", label: "Приёмка" },
  { id: "settle", label: "Расчёт" },
] as const;

export function stageIndex(status: Order["status"]): number {
  switch (status) {
    case "advance_due":
      return 1;
    case "reserving":
      return 2;
    case "picking":
      return 3;
    case "shipping":
      return 4;
    case "in_transit":
      return 5;
    case "delivered":
    case "acceptance_due":
      return 6;
    case "remainder_due":
      return 7;
    case "settled":
      return 8;
    case "cancelled":
      return 0;
    default:
      return 0;
  }
}

export function createOrderFromDeal(deal: Deal, rfq: Rfq | undefined, lots: Lot[]): { order: Order; lots: Lot[] } {
  const product = productById(deal.productId);
  const seller = companyById(deal.sellerId);
  const buyer = companyById(deal.buyerId);
  const pack = packingOf(product);
  const allocated = allocateLots(lots, deal.productId, deal.qty);
  const now = new Date();
  const total = deal.currentPrice * deal.qty;
  const advance = Math.round(total * (deal.prepayPct / 100));
  const remainder = total - advance;
  const dest = deal.destination || rfq?.need.city || buyer.city;
  const incoterm = dest !== seller.city ? "DAP" : deal.incoterm;
  const orderId = uid("ord");

  const invoices: Invoice[] = [
    {
      id: uid("inv"),
      kind: "advance",
      number: `СЧ-${seller.short.slice(0, 3).toUpperCase()}-А-${now.getDate()}`,
      amount: advance,
      status: "issued",
      due: "по выставлению",
    },
    {
      id: uid("inv"),
      kind: "remainder",
      number: `СЧ-${seller.short.slice(0, 3).toUpperCase()}-О-${now.getDate()}`,
      amount: remainder,
      status: "draft",
      due: "по приёмке / отсрочка 14 дн.",
    },
  ];

  const events: ProcessEvent[] = [];
  const push = (stage: string, text: string, addMin: number) => {
    const last = events[events.length - 1];
    const at = last ? isoOffset(new Date(last.at), addMin) : now.toISOString();
    events.push({ id: uid("ev"), at, delayMs: 900, stage, text });
  };

  push(
    "agree",
    `Сделка утверждена. Спецификация: ${packLabel(deal.qty, product)}, ${incoterm} ${dest}.`,
    0,
  );
  push(
    "advance",
    `Выставлен счёт на предоплату ${deal.prepayPct}% — ${rub(advance)}. Агент казначейства покупателя может провести платёж.`,
    2,
  );

  const documents: TradeDocument[] = [
    {
      id: uid("doc"),
      kind: "spec",
      title: "Спецификация партии",
      ref: `${packCount(deal.qty, product)} ${pack.packUnit}`,
      at: now.toISOString(),
    },
    {
      id: uid("doc"),
      kind: "invoice",
      title: invoices[0].number,
      ref: rub(advance),
      at: now.toISOString(),
    },
  ];

  const order: Order = {
    id: orderId,
    dealId: deal.id,
    rfqId: deal.rfqId,
    buyerId: deal.buyerId,
    sellerId: deal.sellerId,
    productId: deal.productId,
    qty: deal.qty,
    packCount: packCount(deal.qty, product),
    unitPrice: deal.currentPrice,
    total,
    prepayPct: deal.prepayPct,
    incoterm,
    destination: dest,
    status: "advance_due",
    allocations: allocated.ok ? allocated.allocations : [],
    invoices,
    shipments: [],
    documents,
    events,
    incidents: [],
    playback: false,
    createdAt: now.toISOString(),
  };

  return { order, lots: allocated.ok ? allocated.lots : lots };
}

export function applyAdvancePayment(order: Order): Order {
  const product = productById(order.productId);
  const seller = companyById(order.sellerId);
  const buyer = companyById(order.buyerId);
  const now = new Date();
  const advance = order.invoices.find((i) => i.kind === "advance");
  const invoices = order.invoices.map((i) =>
    i.kind === "advance" ? { ...i, status: "paid" as const, paidAt: now.toISOString() } : i,
  );

  const events = [...order.events];
  const push = (stage: string, text: string) => {
    events.push({
      id: uid("ev"),
      at: isoOffset(now, events.length),
      delayMs: 1100,
      stage,
      text,
    });
  };

  push("advance", `Платёж по ${advance?.number ?? "счёту"} проведён. ${rub(advance?.amount ?? 0)} зачислены.`);
  const lotsLine = order.allocations
    .map((a) => `${a.batchNo} (${num(a.qty)}\u00a0${product.unit}, ${a.warehouse})`)
    .join("; ");
  push("reserve", `Партии зарезервированы: ${lotsLine || "слот производства"}.`);
  push(
    "pick",
    `Склад ${seller.short} комплектует ${packLabel(order.qty, product)}. Документы: паспорта партий.`,
  );

  const ttn = `ТТН-${Math.floor(100000 + Math.random() * 899999)}`;
  const shipment: Shipment = {
    id: uid("shp"),
    carrier: order.incoterm === "FCA" ? "самовывоз / наёмный" : "контрактный перевозчик площадки",
    ttn,
    vehicle: "фура / 20 т",
    from: order.allocations[0]?.warehouse ?? seller.city,
    to: order.destination,
    etaDays: Math.max(2, order.allocations.reduce((m, a) => Math.max(m, a.readyDays), 0) + 2),
    status: "loaded",
  };
  push("ship", `Отгрузка. ${ttn}, ${shipment.vehicle}, ${shipment.from} → ${shipment.to}. УПД сформирован.`);
  push("transit", `Груз в пути, прибытие через ${days(shipment.etaDays)}. Агент логистики отслеживает накладную.`);
  push(
    "accept",
    `Прибытие на склад ${buyer.short} (${order.destination}). Нужна приёмка по количеству и сертификатам партий.`,
  );

  const documents: TradeDocument[] = [
    ...order.documents,
    { id: uid("doc"), kind: "cert", title: "Паспорта партий", ref: order.allocations.map((a) => a.batchNo).join(", "), at: now.toISOString() },
    { id: uid("doc"), kind: "ttn", title: ttn, ref: `${shipment.from} → ${shipment.to}`, at: now.toISOString() },
    { id: uid("doc"), kind: "upd", title: "УПД", ref: rub(order.total), at: now.toISOString() },
  ];

  return {
    ...order,
    status: "in_transit",
    invoices,
    shipments: [shipment],
    documents,
    events,
    playback: true,
  };
}

export function applyAcceptance(order: Order): Order {
  const now = new Date();
  const remainder = order.invoices.find((i) => i.kind === "remainder");
  const invoices = order.invoices.map((i) =>
    i.kind === "remainder" ? { ...i, status: "issued" as const } : i,
  );
  const events = [
    ...order.events,
    {
      id: uid("ev"),
      at: now.toISOString(),
      delayMs: 0,
      stage: "accept",
      text: "Приёмка подписана. Расхождений по партиям нет.",
    },
    {
      id: uid("ev"),
      at: isoOffset(now, 2),
      delayMs: 800,
      stage: "settle",
      text: `Выставлен остаток ${rub(remainder?.amount ?? 0)} (${100 - order.prepayPct}%). Отсрочка 14 дней.`,
    },
  ];
  const documents: TradeDocument[] = [
    ...order.documents,
    { id: uid("doc"), kind: "acceptance", title: "Акт приёмки", ref: "без претензий", at: now.toISOString() },
    {
      id: uid("doc"),
      kind: "invoice",
      title: remainder?.number ?? "счёт-остаток",
      ref: rub(remainder?.amount ?? 0),
      at: now.toISOString(),
    },
  ];
  return {
    ...order,
    status: remainder && remainder.amount > 0 ? "remainder_due" : "settled",
    invoices,
    events,
    documents,
    playback: false,
    shipments: order.shipments.map((s) => ({ ...s, status: "arrived" })),
  };
}

export function applyRemainderPayment(order: Order): Order {
  const now = new Date();
  return {
    ...order,
    status: "settled",
    invoices: order.invoices.map((i) =>
      i.kind === "remainder" ? { ...i, status: "paid" as const, paidAt: now.toISOString() } : i,
    ),
    events: [
      ...order.events,
      {
        id: uid("ev"),
        at: now.toISOString(),
        delayMs: 0,
        stage: "settle",
        text: "Остаток оплачен. Сделка закрыта. Партии списаны, документы в архиве.",
      },
    ],
    playback: false,
  };
}
