import { companyById } from "./agents";
import { compactRub } from "./format";
import { trustOf } from "./trust";
import type { Company, Deal, Incident, Order, TrustScore } from "./types";

export interface PartnerDossier {
  other: Company;
  as: "supplier" | "client";
  score: number;
  onTimeShipPct: number;
  onTimePayPct: number;
  claimRatePct: number;
  settledCount: number;
  settledVolume: number;
  liveCount: number;
  rooms: number;
  openIncidents: Incident[];
  caution: boolean;
  headline: string;
  facts: string[];
}

function between(selfId: string, otherId: string, order: Order): boolean {
  return (
    (order.buyerId === selfId && order.sellerId === otherId) ||
    (order.sellerId === selfId && order.buyerId === otherId)
  );
}

/** Досье контрагента до торга: надёжность поставщика или платежеспособность клиента. */
export function partnerDossier(
  viewerId: string,
  otherId: string,
  deals: Deal[],
  orders: Order[],
  reputations?: Record<string, TrustScore>,
): PartnerDossier {
  const other = companyById(otherId);
  const viewer = companyById(viewerId);
  const role: "supplier" | "client" =
    other.role === "seller" ? "supplier" : other.role === "buyer" ? "client" : viewer.role === "buyer" ? "supplier" : "client";
  const trust = trustOf(otherId, reputations);
  const history = orders.filter((o) => between(viewerId, otherId, o));
  const settled = history.filter((o) => o.status === "settled");
  const live = history.filter((o) => o.status !== "settled");
  const rooms = deals.filter(
    (d) =>
      (d.buyerId === viewerId && d.sellerId === otherId) || (d.sellerId === viewerId && d.buyerId === otherId),
  ).length;
  const openIncidents = history.flatMap((o) => (o.incidents ?? []).filter((i) => i.status !== "resolved"));
  const settledVolume = settled.reduce((s, o) => s + o.total, 0);
  const caution =
    openIncidents.length > 0 ||
    (role === "supplier" && (trust.onTimeShipPct < 90 || trust.claimRatePct > 4 || trust.score < 80)) ||
    (role === "client" && (trust.onTimePayPct < 85 || trust.score < 80));

  const facts: string[] = [];
  if (role === "supplier") {
    facts.push(`отгрузки в срок ${trust.onTimeShipPct}%`);
    facts.push(`претензии ${trust.claimRatePct}%`);
    facts.push(`срывы без закрытия ${trust.abnormalFulfillPct}%`);
  } else {
    facts.push(`оплаты в срок ${trust.onTimePayPct}%`);
    facts.push(
      trust.onTimePayPct < 85
        ? "на следующих партиях агент поднимает аванс"
        : "аванс можно держать в мандате, без надбавки за риск",
    );
  }
  if (settled.length === 0) {
    facts.push("с этой организацией в сессии ещё не закрывали партию — опираемся на рейтинг площадки");
  } else {
    facts.push(`закрыто ${settled.length} партий на ${compactRub(settledVolume)}`);
  }
  if (live.length) facts.push(`сейчас в исполнении ${live.length}`);
  if (openIncidents.length) facts.push(`открытый спор: ${openIncidents.map((i) => i.kind).join(", ")}`);

  const headline =
    role === "supplier"
      ? caution
        ? "Поставщик с риском по сроку или претензиям — смотрите до утверждения."
        : "Поставщик возит в срок. Можно пускать малую партию по допуску."
      : caution
        ? "Клиент платит с риском. Не отпускайте без аванса и без взгляда человека."
        : "Клиент платит в срок. Повторная партия выгоднее первой.";

  return {
    other,
    as: role,
    score: trust.score,
    onTimeShipPct: trust.onTimeShipPct,
    onTimePayPct: trust.onTimePayPct,
    claimRatePct: trust.claimRatePct,
    settledCount: settled.length,
    settledVolume,
    liveCount: live.length,
    rooms,
    openIncidents,
    caution,
    headline,
    facts,
  };
}
