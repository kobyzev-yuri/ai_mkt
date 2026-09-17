import { companyById, productById } from "./agents";
import { compactRub } from "./format";
import { sellerLeads } from "./leads";
import { autoPassVerdict } from "./policy";
import type { Company, Deal, Order, TradePolicy, TrustScore } from "./types";

export type AlertKind = "human" | "money" | "goods" | "incident" | "lead";

export interface DeskAlert {
  id: string;
  kind: AlertKind;
  urgency: "now" | "soon";
  title: string;
  detail: string;
  href: string;
}

/** Колокольчик: только то, где человек должен войти в контур, а не сводка витрины. */
export function deskAlerts(
  company: Company,
  deals: Deal[],
  orders: Order[],
  reputations?: Record<string, TrustScore>,
  policies?: Record<string, TradePolicy>,
): DeskAlert[] {
  const out: DeskAlert[] = [];
  const mineDeals = deals.filter((d) => d.buyerId === company.id || d.sellerId === company.id);
  const mineOrders = orders.filter((o) => o.buyerId === company.id || o.sellerId === company.id);

  for (const deal of mineDeals) {
    if (deal.status !== "agreed") continue;
    const verdict = autoPassVerdict(deal, orders, reputations, policies);
    if (verdict.ok) continue;
    const other = companyById(company.id === deal.buyerId ? deal.sellerId : deal.buyerId);
    const product = productById(deal.productId);
    out.push({
      id: `deal-${deal.id}`,
      kind: "human",
      urgency: "now",
      title: `Нужна подпись: ${product.name}`,
      detail: `${other.short} · ${compactRub(deal.currentPrice * deal.qty)}. ${verdict.why}`,
      href: `/deals/${deal.id}`,
    });
  }

  for (const order of mineOrders) {
    const product = productById(order.productId);
    if (order.status === "advance_due" && company.id === order.buyerId) {
      out.push({
        id: `adv-${order.id}`,
        kind: "money",
        urgency: "now",
        title: "Аванс не проведён",
        detail: `${product.name} · без оплаты склад не едет`,
        href: `/orders/${order.id}`,
      });
    }
    if (order.status === "remainder_due" && company.id === order.buyerId) {
      out.push({
        id: `rem-${order.id}`,
        kind: "money",
        urgency: "soon",
        title: "Остаток к оплате",
        detail: product.name,
        href: `/orders/${order.id}`,
      });
    }
    if (
      (order.status === "in_transit" || order.status === "delivered" || order.status === "acceptance_due") &&
      company.id === order.buyerId
    ) {
      out.push({
        id: `acc-${order.id}`,
        kind: "goods",
        urgency: order.status === "acceptance_due" ? "now" : "soon",
        title: "Нужна приёмка",
        detail: product.name,
        href: `/orders/${order.id}`,
      });
    }
    for (const inc of order.incidents ?? []) {
      if (inc.status === "resolved") continue;
      out.push({
        id: `inc-${inc.id}`,
        kind: "incident",
        urgency: inc.status === "escalated" ? "now" : "now",
        title: inc.status === "escalated" ? "Эскалация на площадку" : "Спор: нужен обход",
        detail: `${product.name} · ${inc.kind}`,
        href: `/orders/${order.id}`,
      });
    }
  }

  if (company.role !== "buyer") {
    const leads = sellerLeads(deals, company.id, orders, reputations, policies);
    for (const row of leads.incoming) {
      if (row.tag !== "needs-you") continue;
      if (out.some((a) => a.href === `/deals/${row.deal.id}`)) continue;
      const buyer = companyById(row.deal.buyerId);
      const product = productById(row.deal.productId);
      out.push({
        id: `lead-${row.deal.id}`,
        kind: "lead",
        urgency: "now",
        title: `Лид выше допуска: ${product.name}`,
        detail: `${buyer.short} · ${compactRub(row.deal.currentPrice * row.deal.qty)}`,
        href: `/deals/${row.deal.id}`,
      });
    }
  }

  const rank = (a: DeskAlert) => (a.urgency === "now" ? 0 : 1);
  return out.sort((a, b) => rank(a) - rank(b));
}
