import { companyById } from "./agents";
import { compactRub } from "./format";
import { trustOf } from "./trust";
import type { Company, ControlMode, Deal, Order, TradePolicy, TrustScore } from "./types";

export const CONTROL_MODE_LABEL: Record<ControlMode, string> = {
  manual: "Пошаговый контроль",
  threshold: "Допуски",
  auto: "Автопилот в мандате",
};

export const CONTROL_MODE_HINT: Record<ControlMode, string> = {
  manual: "Агент торгует в мандате. Каждая согласованная сделка, аванс и приёмка ждут вашу подпись.",
  threshold: "Малая партия и надёжный контрагент проходят сами. Крупное, спорное и слабое доверие — колокольчик.",
  auto: "Если доверие контрагента не ниже порога и нет открытого спора, сделка утверждается без вас. Деньги и приёмка остаются за человеком.",
};

export function policyOf(company: Company, overlay?: Record<string, TradePolicy>): TradePolicy {
  return (
    overlay?.[company.id] ?? {
      controlMode: company.agent.controlMode,
      autoApproveBelow: company.agent.autoApproveBelow,
      minTrustToAuto: company.agent.minTrustToAuto,
    }
  );
}

export function applyPolicy(company: Company, policy: TradePolicy): Company {
  return { ...company, agent: { ...company.agent, ...policy } };
}

export function dealVolume(deal: Pick<Deal, "currentPrice" | "qty">): number {
  return deal.currentPrice * deal.qty;
}

export function openIncidentsBetween(a: string, b: string, orders: Order[]) {
  return orders
    .filter(
      (o) => (o.buyerId === a && o.sellerId === b) || (o.sellerId === a && o.buyerId === b),
    )
    .flatMap((o) => (o.incidents ?? []).filter((i) => i.status !== "resolved"));
}

export interface GateVerdict {
  ok: boolean;
  why: string;
  volume: number;
}

function partyAllows(
  party: Company,
  policy: TradePolicy,
  volume: number,
  counterpartyMetric: number,
  incidents: number,
  metricLabel: string,
): GateVerdict {
  if (policy.controlMode === "manual") {
    return {
      ok: false,
      why: `«${party.short}»: пошаговый контроль — нужна подпись человека`,
      volume,
    };
  }
  if (incidents > 0) {
    return {
      ok: false,
      why: `«${party.short}»: открытый спор с контрагентом — автопрохода нет`,
      volume,
    };
  }
  if (counterpartyMetric < policy.minTrustToAuto) {
    return {
      ok: false,
      why: `«${party.short}»: ${metricLabel} ${counterpartyMetric} ниже допуска ${policy.minTrustToAuto}`,
      volume,
    };
  }
  if (policy.controlMode === "threshold" && volume > policy.autoApproveBelow) {
    return {
      ok: false,
      why: `«${party.short}»: сумма ${compactRub(volume)} выше допуска ${compactRub(policy.autoApproveBelow)}`,
      volume,
    };
  }
  const how =
    policy.controlMode === "auto"
      ? `автопилот, ${metricLabel} ${counterpartyMetric}`
      : `малая партия в допуске ${compactRub(policy.autoApproveBelow)}, ${metricLabel} ${counterpartyMetric}`;
  return { ok: true, why: `«${party.short}»: ${how}`, volume };
}

/** Обе стороны должны пустить сделку. Закупщик смотрит надёжность поставщика, поставщик — оплату клиента. */
export function autoPassVerdict(
  deal: Deal,
  orders: Order[],
  reputations?: Record<string, TrustScore>,
  policies?: Record<string, TradePolicy>,
): GateVerdict {
  const volume = dealVolume(deal);
  if (deal.status !== "agreed") {
    return { ok: false, why: "стороны ещё не сошлись", volume };
  }
  const buyer = companyById(deal.buyerId);
  const seller = companyById(deal.sellerId);
  const buyerPol = policyOf(buyer, policies);
  const sellerPol = policyOf(seller, policies);
  const sellerTrust = trustOf(seller.id, reputations);
  const buyerTrust = trustOf(buyer.id, reputations);
  const incidents = openIncidentsBetween(buyer.id, seller.id, orders).length;
  const buyerGate = partyAllows(buyer, buyerPol, volume, sellerTrust.score, incidents, "надёжность поставщика");
  if (!buyerGate.ok) return buyerGate;
  const sellerGate = partyAllows(seller, sellerPol, volume, buyerTrust.onTimePayPct, incidents, "оплаты клиента в срок");
  if (!sellerGate.ok) return sellerGate;
  return { ok: true, why: `${buyerGate.why}. ${sellerGate.why}`, volume };
}

export function bestAutoPass(
  deals: Deal[],
  orders: Order[],
  reputations?: Record<string, TrustScore>,
  policies?: Record<string, TradePolicy>,
): { deal: Deal; verdict: GateVerdict } | undefined {
  const ranked = deals
    .map((deal) => ({ deal, verdict: autoPassVerdict(deal, orders, reputations, policies) }))
    .filter((x) => x.verdict.ok)
    .sort((a, b) => b.deal.score - a.deal.score);
  return ranked[0];
}
