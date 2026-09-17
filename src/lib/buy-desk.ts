import { trustOf } from "./trust";
import type { Deal, Order, TrustScore } from "./types";

export interface BuyerGate {
  kind: "deal" | "order";
  href: string;
  title: string;
  party: string;
  money: number;
  action: string;
  status: string;
}

export function buyerDeals(deals: Deal[], buyerId: string): Deal[] {
  return deals.filter((d) => d.buyerId === buyerId);
}

export function buyerOrders(orders: Order[], buyerId: string): Order[] {
  return orders.filter((o) => o.buyerId === buyerId);
}

export function hasOpenIncident(order: Order): boolean {
  return (order.incidents ?? []).some((i) => i.status !== "resolved");
}

export function orderGateAction(order: Order): string | null {
  if (hasOpenIncident(order)) return "Решить инцидент";
  if (order.status === "advance_due") return "Оплатить аванс";
  if (order.status === "acceptance_due" || order.status === "delivered") return "Принять поставку";
  if (order.status === "remainder_due") return "Оплатить остаток";
  return null;
}

export function isLiveOrder(order: Order): boolean {
  return order.status !== "settled" && order.status !== "cancelled";
}

export function isHistoryOrder(order: Order): boolean {
  return order.status === "settled" || order.status === "cancelled";
}

export function isLiveDeal(deal: Deal): boolean {
  return deal.status === "open" || deal.status === "countering" || deal.status === "agreed";
}

export function evaluateBuyer(
  buyerId: string,
  deals: Deal[],
  orders: Order[],
  reputations?: Record<string, TrustScore>,
) {
  const mine = buyerDeals(deals, buyerId);
  const mineOrders = buyerOrders(orders, buyerId);
  const priced = mine.filter((d) => d.currentPrice > 0);
  const mandateOk = priced.filter((d) => d.currentPrice + 0.001 >= d.floorPrice).length;
  const agreed = mine.filter((d) => d.status === "agreed" || d.status === "approved").length;
  const settled = mineOrders.filter((o) => o.status === "settled");
  const spend = settled.reduce((s, o) => s + o.total, 0);
  const live = mineOrders.filter(isLiveOrder);
  const gates =
    mine.filter((d) => d.status === "agreed").length + mineOrders.filter((o) => orderGateAction(o)).length;
  return {
    rooms: mine.length,
    agreedPct: mine.length ? Math.round((agreed / mine.length) * 100) : 0,
    mandateOkPct: priced.length ? Math.round((mandateOk / priced.length) * 100) : 100,
    gates,
    live: live.length,
    settled: settled.length,
    spend,
    trust: trustOf(buyerId, reputations).score,
    onTimePayPct: trustOf(buyerId, reputations).onTimePayPct,
  };
}
