import { uid } from "./ids";
import { advancePaid, contourClosed, incidentRoles } from "./incident-desk";
import { playbookOf, proposeRemedy, unwindModeOf } from "./incident-playbook";
import { releaseLots } from "./inventory";
import { applyTrustHit, INCIDENT_LABEL, trustOf } from "./trust";
import type { Incident, IncidentKind, Lot, Order, TrustScore } from "./types";

export function openIncident(
  order: Order,
  kind: IncidentKind,
  raisedBy: Incident["raisedBy"],
  delayDays = 2,
): Order {
  if ((order.incidents ?? []).some((i) => i.kind === kind && i.status !== "resolved")) return order;
  const book = playbookOf(kind);
  const incident: Incident = {
    id: uid("inc"),
    orderId: order.id,
    kind,
    raisedBy,
    at: new Date().toISOString(),
    status: "negotiating",
    fact: book.life,
    delayDays,
    proposed: book.workaround(order, delayDays),
  };
  const roles = incidentRoles(incident, { ...order, incidents: [...(order.incidents ?? []), incident] });
  return {
    ...order,
    incidents: [...(order.incidents ?? []), incident],
    events: [
      ...order.events,
      {
        id: uid("ev"),
        at: incident.at,
        delayMs: 0,
        stage: "dispute",
        text: `${roles.reporter.title} зафиксировал «${INCIDENT_LABEL[kind]}». ${roles.proposer.title} предлагает: ${incident.proposed.text}`,
      },
    ],
    playback: false,
  };
}

export function acceptRemedy(order: Order, incidentId: string): Order {
  const inc = order.incidents.find((i) => i.id === incidentId);
  if (!inc || inc.status === "resolved") return order;
  const applied = playbookOf(inc.kind).applyContinue(order, inc);
  return {
    ...applied,
    incidents: applied.incidents.map((i) =>
      i.id === incidentId
        ? { ...i, status: "resolved" as const, resolution: `Принято без площадки: ${i.proposed.text}` }
        : i,
    ),
  };
}

export function escalateIncident(order: Order, incidentId: string): Order {
  const inc = order.incidents.find((i) => i.id === incidentId);
  if (!inc || inc.status === "resolved") return order;
  return {
    ...order,
    incidents: order.incidents.map((i) =>
      i.id === incidentId
        ? {
            ...i,
            status: "escalated" as const,
            resolution:
              "Эскалация на Atrium. Решение площадки по доказательствам в заказе (переписка, накладная, УПД), не по устным договорённостям.",
          }
        : i,
    ),
    events: [
      ...order.events,
      {
        id: uid("ev"),
        at: new Date().toISOString(),
        delayMs: 0,
        stage: "dispute",
        text: "Заявитель отклонил обход. Площадка входит как арбитр. Без документов в контуре претензия не защищена.",
      },
    ],
  };
}

function trustTarget(order: Order, inc: Incident): { role: "buyer" | "seller"; id: string } {
  const role: "buyer" | "seller" = inc.kind === "delay_pay" ? "buyer" : "seller";
  return { role, id: role === "buyer" ? order.buyerId : order.sellerId };
}

export function platformResolve(
  order: Order,
  incidentId: string,
  reputations: Record<string, TrustScore>,
): { order: Order; reputations: Record<string, TrustScore> } {
  const inc = order.incidents.find((i) => i.id === incidentId);
  if (!inc) return { order, reputations };
  const hit = trustTarget(order, inc);
  const nextRep =
    inc.kind === "force_majeure"
      ? reputations
      : { ...reputations, [hit.id]: applyTrustHit(trustOf(hit.id, reputations), inc.kind, hit.role) };
  const withMoney = acceptRemedy(order, incidentId);
  return {
    reputations: nextRep,
    order: {
      ...withMoney,
      incidents: withMoney.incidents.map((i) =>
        i.id === incidentId
          ? {
              ...i,
              status: "resolved",
              resolution:
                inc.kind === "force_majeure"
                  ? "Решение Atrium: срок сдвинут по форс-мажору, рейтинг не трогаем — есть документ в контуре."
                  : `Решение Atrium: обход зафиксирован, рейтинг ${hit.role === "buyer" ? "закупщика" : "поставщика"} обновлён.`,
            }
          : i,
      ),
    },
  };
}

/** Walk away: unpaid unreserve or paid refund. Kind-specific copy. */
export function platformUnwind(
  order: Order,
  incidentId: string,
  lots: Lot[],
  reputations: Record<string, TrustScore>,
): { order: Order; lots: Lot[]; reputations: Record<string, TrustScore> } {
  const inc = order.incidents.find((i) => i.id === incidentId);
  if (!inc || contourClosed(order)) return { order, lots, reputations };
  const mode = unwindModeOf(order, inc.kind);
  if (mode === "none") return { order, lots, reputations };
  if (mode === "paid" && !advancePaid(order)) return { order, lots, reputations };
  if (mode === "unpaid" && advancePaid(order)) return { order, lots, reputations };
  const hit = trustTarget(order, inc);
  const nextRep =
    inc.kind === "force_majeure"
      ? reputations
      : { ...reputations, [hit.id]: applyTrustHit(trustOf(hit.id, reputations), inc.kind, hit.role) };
  const copy = playbookOf(inc.kind).unwindResolution(order, inc);
  const now = new Date().toISOString();
  return {
    lots: releaseLots(lots, order.allocations),
    reputations: nextRep,
    order: {
      ...order,
      status: "cancelled",
      playback: false,
      invoices: order.invoices.map((inv) =>
        inv.kind === "remainder" && inv.status !== "paid" ? { ...inv, status: "cancelled" } : inv,
      ),
      incidents: order.incidents.map((i) =>
        i.id === incidentId ? { ...i, status: "resolved", resolution: copy.resolution } : i,
      ),
      events: [
        ...order.events,
        { id: uid("ev"), at: now, delayMs: 0, stage: "dispute", text: copy.event },
      ],
    },
  };
}

/** @deprecated use platformUnwind — kept for call sites that name the paid case. */
export function platformBreakPaid(
  order: Order,
  incidentId: string,
  lots: Lot[],
  reputations: Record<string, TrustScore>,
): { order: Order; lots: Lot[]; reputations: Record<string, TrustScore> } {
  return platformUnwind(order, incidentId, lots, reputations);
}

export { proposeRemedy };
