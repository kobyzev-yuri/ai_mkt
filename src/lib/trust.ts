import { proposeRemedy as playbookRemedy } from "./incident-playbook";
import type { IncidentKind, Remedy, TrustScore } from "./types";

const base = (over: Partial<TrustScore> = {}): TrustScore => ({
  onTimeShipPct: 96,
  onTimePayPct: 95,
  claimRatePct: 2.4,
  avgResponseHrs: 6,
  abnormalFulfillPct: 3,
  score: 88,
  ...over,
});

export const seedTrust: Record<string, TrustScore> = {
  "co-severpak": base({ onTimeShipPct: 97, claimRatePct: 1.8, avgResponseHrs: 4, score: 92 }),
  "co-ural": base({ onTimeShipPct: 91, claimRatePct: 4.1, abnormalFulfillPct: 7, avgResponseHrs: 9, score: 81 }),
  "co-volga": base({ onTimeShipPct: 98, claimRatePct: 1.2, avgResponseHrs: 6, score: 94 }),
  "co-him": base({ onTimeShipPct: 94, claimRatePct: 3.0, score: 86 }),
  "co-spec": base({ onTimeShipPct: 95, claimRatePct: 2.1, avgResponseHrs: 5, score: 89 }),
  "co-les": base({ onTimeShipPct: 88, claimRatePct: 5.5, abnormalFulfillPct: 9, avgResponseHrs: 11, score: 74 }),
  "co-kofe": base({ onTimePayPct: 94, onTimeShipPct: 100, score: 90 }),
  "co-teh": base({ onTimePayPct: 96, onTimeShipPct: 100, avgResponseHrs: 8, score: 91 }),
  "co-agro": base({ onTimePayPct: 89, onTimeShipPct: 100, score: 82 }),
  "co-retail": base({ onTimePayPct: 78, onTimeShipPct: 100, claimRatePct: 6.2, score: 71 }),
};

export function trustOf(id: string, overlay?: Record<string, TrustScore>): TrustScore {
  return overlay?.[id] ?? seedTrust[id] ?? base();
}

export function proposeRemedy(kind: IncidentKind, delayDays = 2, orderTotal = 0): Remedy {
  return playbookRemedy(kind, delayDays, orderTotal);
}

export function applyTrustHit(
  current: TrustScore,
  kind: IncidentKind,
  role: "seller" | "buyer",
): TrustScore {
  const next = { ...current };
  if (kind === "delay_ship" && role === "seller") {
    next.onTimeShipPct = Math.max(50, next.onTimeShipPct - 2);
    next.abnormalFulfillPct = Math.min(40, next.abnormalFulfillPct + 1.5);
  }
  if (kind === "delay_pay" && role === "buyer") {
    next.onTimePayPct = Math.max(50, next.onTimePayPct - 3);
  }
  if ((kind === "quality" || kind === "shortage") && role === "seller") {
    next.claimRatePct = Math.min(25, next.claimRatePct + 1.2);
  }
  if (kind === "docs" && role === "seller") {
    next.abnormalFulfillPct = Math.min(40, next.abnormalFulfillPct + 0.8);
  }
  if (kind === "stock_miss" && role === "seller") {
    next.abnormalFulfillPct = Math.min(40, next.abnormalFulfillPct + 3);
    next.claimRatePct = Math.min(25, next.claimRatePct + 0.8);
  }
  next.score = Math.round(
    next.onTimeShipPct * 0.28 +
      next.onTimePayPct * 0.28 +
      (100 - next.claimRatePct * 4) * 0.2 +
      (100 - next.abnormalFulfillPct * 3) * 0.14 +
      Math.max(0, 100 - next.avgResponseHrs * 4) * 0.1,
  );
  return next;
}

export const BUYER_INCIDENT_KINDS: IncidentKind[] = [
  "delay_ship",
  "shortage",
  "quality",
  "docs",
  "stock_miss",
];
export const SELLER_INCIDENT_KINDS: IncidentKind[] = ["delay_pay", "force_majeure"];

export const INCIDENT_LABEL: Record<IncidentKind, string> = {
  delay_ship: "Срыв отгрузки",
  delay_pay: "Просрочка оплаты",
  shortage: "Недостача при приёмке",
  quality: "Качество / спецификация",
  docs: "Накладная / УПД / паспорт",
  stock_miss: "Лот не подтвердился",
  force_majeure: "Форс-мажор",
};
