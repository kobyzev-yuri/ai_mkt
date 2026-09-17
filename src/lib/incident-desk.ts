import { companyById } from "./agents";
import { INCIDENT_LABEL } from "./trust";
import type { Incident, IncidentKind, Order, OrderStatus } from "./types";

export function incidentRoomPath(orderId: string): string {
  return `/orders/${orderId}/incident`;
}

export function reporterSide(raisedBy: Incident["raisedBy"], kind: IncidentKind): "buyer" | "seller" {
  if (raisedBy === "buyer" || raisedBy === "seller") return raisedBy;
  return kind === "delay_pay" || kind === "force_majeure" ? "seller" : "buyer";
}

/** Agent of the party that can actually fix the fact. */
export function proposerRole(kind: IncidentKind): "buyer-agent" | "seller-agent" {
  return kind === "delay_pay" ? "buyer-agent" : "seller-agent";
}

/** Human who accepts or rejects the workaround — the injured side. */
export function deciderSide(inc: Pick<Incident, "kind" | "raisedBy">): "buyer" | "seller" {
  if (inc.kind === "force_majeure") return "buyer";
  return reporterSide(inc.raisedBy, inc.kind);
}

export function incidentRoles(inc: Incident, order: Order) {
  const buyer = companyById(order.buyerId);
  const seller = companyById(order.sellerId);
  const reporter = reporterSide(inc.raisedBy, inc.kind);
  const decider = deciderSide(inc);
  const proposer = proposerRole(inc.kind);
  const reporterCo = reporter === "buyer" ? buyer : seller;
  const deciderCo = decider === "buyer" ? buyer : seller;
  const proposerCo = proposer === "buyer-agent" ? buyer : seller;
  return {
    reporter: {
      side: reporter,
      who: "human" as const,
      title: `${reporterCo.short} · человек`,
      job: "Фиксирует факт в контуре. Не торгуется репликой.",
    },
    proposer: {
      side: proposer === "buyer-agent" ? ("buyer" as const) : ("seller" as const),
      who: "agent" as const,
      title: `Агент «${proposerCo.agent.name}»`,
      job: `Предлагает обход в мандате ${proposerCo.short}. Рейтинг здесь не бьём.`,
    },
    decider: {
      side: decider,
      who: "human" as const,
      title: `${deciderCo.short} · человек`,
      job: "Принимает обход или отклоняет его на площадку.",
    },
    platform: {
      who: "human" as const,
      title: "Atrium · бэкофис",
      job: "Только после отклонения. Решение по документам заказа. Рейтинг бьём только здесь.",
    },
  };
}

const BUYER_BY_STATUS: Partial<Record<OrderStatus, IncidentKind[]>> = {
  advance_due: ["stock_miss"],
  reserving: ["stock_miss"],
  picking: ["stock_miss"],
  shipping: ["delay_ship", "stock_miss"],
  in_transit: ["delay_ship"],
  delivered: ["shortage", "quality", "docs", "delay_ship"],
  acceptance_due: ["shortage", "quality", "docs"],
};

const SELLER_BY_STATUS: Partial<Record<OrderStatus, IncidentKind[]>> = {
  advance_due: ["delay_pay", "force_majeure"],
  reserving: ["force_majeure"],
  picking: ["force_majeure"],
  shipping: ["force_majeure"],
  in_transit: ["force_majeure"],
  delivered: ["force_majeure"],
  acceptance_due: ["force_majeure"],
  remainder_due: ["delay_pay", "force_majeure"],
};

export const KIND_WHEN: Record<IncidentKind, string> = {
  delay_ship: "Пока партия в пути или срок вышел — не после закрытия контура.",
  delay_pay: "Пока ждут аванс или остаток.",
  shortage: "На приёмке, пока акт не подписан «как есть».",
  quality: "На приёмке, если паспорт не бьётся с грузом.",
  docs: "На приёмке, если нет УПД, ТТН или паспорта.",
  stock_miss: "До отгрузки, если склад не подтвердил лот.",
  force_majeure: "Пока заказ живой и есть документ о причине.",
};

export function contourClosed(order: Order): boolean {
  return order.status === "settled" || order.status === "cancelled";
}

export function allowedKinds(order: Order, side: "buyer" | "seller"): IncidentKind[] {
  if (contourClosed(order)) return [];
  const map = side === "buyer" ? BUYER_BY_STATUS : SELLER_BY_STATUS;
  return map[order.status] ?? [];
}

export function reportableKinds(order: Order, side: "buyer" | "seller"): IncidentKind[] {
  const open = new Set((order.incidents ?? []).filter((i) => i.status !== "resolved").map((i) => i.kind));
  return allowedKinds(order, side).filter((kind) => !open.has(kind));
}

export function openIncidents(order: Order): Incident[] {
  return (order.incidents ?? []).filter((i) => i.status !== "resolved");
}

export function canAcceptRemedy(order: Order, incident: Incident, companyId: string): boolean {
  if (incident.status !== "negotiating") return false;
  const side = companyId === order.buyerId ? "buyer" : companyId === order.sellerId ? "seller" : null;
  return side === deciderSide(incident);
}

export function canEscalate(order: Order, incident: Incident, companyId: string): boolean {
  if (incident.status !== "negotiating") return false;
  return companyId === order.buyerId || companyId === order.sellerId;
}

export const INCIDENT_STATUS_LABEL: Record<Incident["status"], string> = {
  open: "факт",
  negotiating: "обход предложен",
  escalated: "у площадки",
  resolved: "закрыт",
};

export { INCIDENT_LABEL };
