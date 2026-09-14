import { trustOf } from "./trust";
import type { Company, Deal, Order, TrustScore } from "./types";

export type NextMove = "agents" | "tactic" | "call";

export interface PartnerMemo {
  partnerId: string;
  closed: number;
  onTimePct: number;
  onTimeLabel: string;
  humanNeeded: number;
  nearBoundPct?: number;
  next: { id: NextMove; label: string };
  line: string;
}

function pairOf(a: string, b: string, buyerId: string, sellerId: string) {
  return (buyerId === a && sellerId === b) || (buyerId === b && sellerId === a);
}

const NEXT_LABEL: Record<NextMove, string> = {
  agents: "ещё круг агентов",
  tactic: "сменить тактику",
  call: "сразу звонок человека",
};

export function partnerMemo(
  selfId: string,
  partnerId: string,
  viewer: "buyer" | "seller",
  deals: Deal[],
  orders: Order[],
  reputations?: Record<string, TrustScore>,
): PartnerMemo {
  const pairDeals = deals.filter((d) => pairOf(selfId, partnerId, d.buyerId, d.sellerId));
  const pairOrders = orders.filter((o) => pairOf(selfId, partnerId, o.buyerId, o.sellerId));
  const closed = pairOrders.filter((o) => o.status === "settled").length;
  const incidents = pairOrders.flatMap((o) => o.incidents);
  const humanNeeded =
    incidents.length + pairDeals.filter((d) => d.status === "agreed").length;
  const sellerId = viewer === "buyer" ? partnerId : selfId;
  const buyerId = viewer === "buyer" ? selfId : partnerId;
  const trust = trustOf(viewer === "buyer" ? sellerId : buyerId, reputations);
  const onTimePct = viewer === "buyer" ? trust.onTimeShipPct : trust.onTimePayPct;
  const onTimeLabel = viewer === "buyer" ? "отгрузки в срок" : "оплаты в срок";

  let nearBoundPct: number | undefined;
  if (viewer === "seller") {
    const priced = pairDeals.filter((d) => d.status === "agreed" || d.status === "approved");
    if (priced.length) {
      const near = priced.filter((d) => d.currentPrice <= d.floorPrice * 1.02).length;
      nearBoundPct = Math.round((near / priced.length) * 100);
    }
  }

  const last = [...pairDeals].sort((a, b) => b.id.localeCompare(a.id))[0];
  const openIncident = incidents.some((i) => i.status === "escalated" || i.status === "open" || i.status === "negotiating");
  let next: NextMove = "agents";
  if (openIncident || humanNeeded >= 2) next = "call";
  else if (last?.status === "rejected") next = "tactic";

  const bits = [
    closed ? `закрыли ${closed}` : "в сессии ещё не закрывали",
    `${onTimeLabel} ${onTimePct}%`,
    humanNeeded ? `человек понадобился ${humanNeeded} ${humanNeeded === 1 ? "раз" : humanNeeded < 5 ? "раза" : "раз"}` : "человек не понадобился",
  ];
  if (nearBoundPct != null) bits.push(`сходились у нижней границы мандата ${nearBoundPct}%`);
  bits.push(`рекомендуем: ${NEXT_LABEL[next]}`);

  return {
    partnerId,
    closed,
    onTimePct,
    onTimeLabel,
    humanNeeded,
    nearBoundPct,
    next: { id: next, label: NEXT_LABEL[next] },
    line: bits.join(". ") + ".",
  };
}

export function memosFor(
  self: Company,
  deals: Deal[],
  orders: Order[],
  reputations?: Record<string, TrustScore>,
  partnerIds?: string[],
): PartnerMemo[] {
  const viewer = self.role === "seller" ? "seller" : "buyer";
  const ids =
    partnerIds ??
    [
      ...new Set([
        ...deals.filter((d) => d.buyerId === self.id).map((d) => d.sellerId),
        ...deals.filter((d) => d.sellerId === self.id).map((d) => d.buyerId),
        ...orders.filter((o) => o.buyerId === self.id).map((o) => o.sellerId),
        ...orders.filter((o) => o.sellerId === self.id).map((o) => o.buyerId),
      ]),
    ];
  return ids.map((id) => partnerMemo(self.id, id, viewer, deals, orders, reputations));
}
