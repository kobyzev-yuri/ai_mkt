import { companyById } from "./agents";
import { autoPassVerdict, dealVolume, policyOf } from "./policy";
import { trustOf } from "./trust";
import type { Company, Deal, Order, TradePolicy, TrustScore } from "./types";

export type LeadTag = "needs-you" | "agent-replied" | "missed" | "won";

export function leadTag(
  deal: Deal,
  seller?: Company,
  orders: Order[] = [],
  reputations?: Record<string, TrustScore>,
  policies?: Record<string, TradePolicy>,
): LeadTag {
  const firm = seller ?? companyById(deal.sellerId);
  const policy = policyOf(firm, policies);
  if (deal.status === "rejected") return "missed";
  if (deal.status === "approved") return "won";
  if (deal.status === "agreed") {
    return autoPassVerdict(deal, orders, reputations, policies).ok ? "agent-replied" : "needs-you";
  }
  const volume = dealVolume(deal);
  const buyerPay = trustOf(deal.buyerId, reputations).onTimePayPct;
  if (policy.controlMode === "manual") return "needs-you";
  if (volume > policy.autoApproveBelow) return "needs-you";
  if (buyerPay < policy.minTrustToAuto) return "needs-you";
  return "agent-replied";
}

export const LEAD_LABEL: Record<LeadTag, string> = {
  "needs-you": "нужен вы",
  "agent-replied": "агент ответил",
  missed: "пропущено",
  won: "в работе",
};

export function sellerLeads(
  deals: Deal[],
  sellerId: string,
  orders: Order[] = [],
  reputations?: Record<string, TrustScore>,
  policies?: Record<string, TradePolicy>,
) {
  const seller = companyById(sellerId);
  const mine = deals.filter((d) => d.sellerId === sellerId);
  const tagged = mine.map((deal) => ({
    deal,
    tag: leadTag(deal, seller, orders, reputations, policies),
  }));
  return {
    seller,
    incoming: tagged.filter((x) => x.tag === "needs-you" || x.tag === "agent-replied"),
    missed: tagged.filter((x) => x.tag === "missed"),
    won: tagged.filter((x) => x.tag === "won"),
  };
}
