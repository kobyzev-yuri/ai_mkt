import { companies } from "./seed";
import { trustOf } from "./trust";
import type { Deal, Order, TrustScore } from "./types";

export interface AgentCard {
  companyId: string;
  short: string;
  agent: string;
  role: "buyer" | "seller" | "both";
  rooms: number;
  agreedPct: number;
  mandateOkPct: number;
  avgScore: number;
  trust: number;
  responseMin: number;
}

export interface Effectiveness {
  rooms: number;
  agreedPct: number;
  mandateOkPct: number;
  avgMatchScore: number;
  humanGatesPerSettled: number;
  autoRemedyPct: number;
  openIncidents: number;
  settledOrders: number;
  cards: AgentCard[];
}

function mandateOk(d: Deal): boolean {
  return d.currentPrice + 0.001 >= d.floorPrice;
}

export function evaluateMarketplace(
  deals: Deal[],
  orders: Order[],
  reputations?: Record<string, TrustScore>,
): Effectiveness {
  const rooms = deals.length;
  const agreed = deals.filter((d) => d.status === "agreed" || d.status === "approved").length;
  const priced = deals.filter((d) => d.currentPrice > 0);
  const ok = priced.filter(mandateOk).length;
  const avgMatchScore = rooms
    ? Math.round(deals.reduce((s, d) => s + d.score, 0) / rooms)
    : 0;

  const incidents = orders.flatMap((o) => o.incidents ?? []);
  const closed = incidents.filter((i) => i.status === "resolved");
  const auto = closed.filter((i) => (i.resolution ?? "").startsWith("Принято:")).length;
  const settled = orders.filter((o) => o.status === "settled").length;
  const gates = settled * 4;

  const cards: AgentCard[] = companies.map((c) => {
    const mine = deals.filter((d) => d.buyerId === c.id || d.sellerId === c.id);
    const hit = mine.filter((d) => d.status === "agreed" || d.status === "approved").length;
    const pricedMine = mine.filter((d) => d.currentPrice > 0);
    const floorHit = pricedMine.filter(mandateOk).length;
    return {
      companyId: c.id,
      short: c.short,
      agent: c.agent.name,
      role: c.role,
      rooms: mine.length,
      agreedPct: mine.length ? Math.round((hit / mine.length) * 100) : 0,
      mandateOkPct: pricedMine.length ? Math.round((floorHit / pricedMine.length) * 100) : 100,
      avgScore: mine.length ? Math.round(mine.reduce((s, d) => s + d.score, 0) / mine.length) : 0,
      trust: trustOf(c.id, reputations).score,
      responseMin: c.agent.responseMin,
    };
  });

  return {
    rooms,
    agreedPct: rooms ? Math.round((agreed / rooms) * 100) : 0,
    mandateOkPct: priced.length ? Math.round((ok / priced.length) * 100) : 100,
    avgMatchScore,
    humanGatesPerSettled: settled ? Math.round(gates / settled) : 4,
    autoRemedyPct: closed.length ? Math.round((auto / closed.length) * 100) : 0,
    openIncidents: incidents.filter((i) => i.status !== "resolved").length,
    settledOrders: settled,
    cards: cards.sort((a, b) => b.rooms - a.rooms || b.trust - a.trust),
  };
}
