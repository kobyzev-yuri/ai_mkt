import {
  hasOpenIncident,
  isHistoryOrder,
  isLiveDeal,
  isLiveOrder,
} from "./buy-desk";
import { trustOf } from "./trust";
import type { Deal, Order, TrustScore } from "./types";

export function sellerDeals(deals: Deal[], sellerId: string): Deal[] {
  return deals.filter((d) => d.sellerId === sellerId);
}

export function sellerOrders(orders: Order[], sellerId: string): Order[] {
  return orders.filter((o) => o.sellerId === sellerId);
}

export function sellerDealGate(deal: Deal): string | null {
  if (deal.status === "agreed") return "Утвердить или отклонить";
  return null;
}

export function sellerOrderGate(order: Order): string | null {
  if (hasOpenIncident(order)) return "Решить инцидент";
  if (order.status === "advance_due") return "Ждёт аванс · можно вернуть партии";
  return null;
}

export { hasOpenIncident, isHistoryOrder, isLiveDeal, isLiveOrder };

export function evaluateSeller(
  sellerId: string,
  deals: Deal[],
  orders: Order[],
  reputations?: Record<string, TrustScore>,
) {
  const mine = sellerDeals(deals, sellerId);
  const mineOrders = sellerOrders(orders, sellerId);
  const priced = mine.filter((d) => d.currentPrice > 0);
  const mandateOk = priced.filter((d) => d.currentPrice + 0.001 >= d.floorPrice).length;
  const agreed = mine.filter((d) => d.status === "agreed" || d.status === "approved").length;
  const settled = mineOrders.filter((o) => o.status === "settled");
  const revenue = settled.reduce((s, o) => s + o.total, 0);
  const live = mineOrders.filter(isLiveOrder);
  const gates =
    mine.filter((d) => sellerDealGate(d)).length + mineOrders.filter((o) => sellerOrderGate(o)).length;
  const trust = trustOf(sellerId, reputations);
  return {
    rooms: mine.length,
    agreedPct: mine.length ? Math.round((agreed / mine.length) * 100) : 0,
    mandateOkPct: priced.length ? Math.round((mandateOk / priced.length) * 100) : 100,
    gates,
    live: live.length,
    settled: settled.length,
    revenue,
    trust: trust.score,
    onTimeShipPct: trust.onTimeShipPct,
  };
}
