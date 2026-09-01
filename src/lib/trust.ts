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
  switch (kind) {
    case "delay_ship": {
      const pct = Math.min(5, Math.max(0.5, delayDays * 0.5));
      const amount = Math.round((orderTotal * pct) / 100);
      return {
        kind: "price_cut",
        amount,
        extraDays: delayDays,
        text: `Компенсация ${pct}% за срыв отгрузки: ${amount} ₽ зачётом в счёт остатка. Срок +${delayDays} дн.`,
      };
    }
    case "delay_pay": {
      const amount = Math.round((orderTotal * 0.1 * delayDays) / 100);
      return {
        kind: "penalty_hold",
        amount,
        extraDays: delayDays,
        text: `Пеня ${delayDays}×0,1% (${amount} ₽). Следующие партии — предоплата +10 п.п., резерв не снимается.`,
      };
    }
    case "shortage":
      return {
        kind: "credit_note",
        text: "Зачёт на недостачу + довоз из соседней партии. Акт расхождения при приёмке.",
      };
    case "quality":
      return {
        kind: "replace_lot",
        text: "Замена партии или −8% к цене при приёмке с актом. Третьи лица (лаборатория) — за счёт виновной стороны.",
      };
    case "docs":
      return {
        kind: "reissue_docs",
        extraDays: 1,
        text: "Перевыпуск накладной и УПД за 1 день. Без закрывающих сделка не закрывается — это не мелочь.",
      };
    case "stock_miss":
      return {
        kind: "split_ship",
        extraDays: 7,
        text: "Лот не подтвердился. Дробим: что есть — сейчас, остаток со слота производства. Либо отмена с ударом по рейтингу склада.",
      };
    default:
      return {
        kind: "extend_sla",
        extraDays: 5,
        text: "Форс-мажор: сдвигаем срок поставки, рейтинг не трогаем, если есть справка. Иначе — как срыв срока.",
      };
  }
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
