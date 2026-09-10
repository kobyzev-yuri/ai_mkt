import { uid } from "./ids";
import { applyTrustHit, INCIDENT_LABEL, proposeRemedy, trustOf } from "./trust";
import type { Incident, IncidentKind, Order, TrustScore } from "./types";

const FACT: Record<IncidentKind, string> = {
  delay_ship: "Отгрузка вышла за срок. На реальных площадках это сразу бьёт долю поставок в срок и открывает окно претензии.",
  delay_pay: "Остаток или аванс не пришёл в срок. В B2B больше половины счетов просрочены — поставщик держит следующие лоты и поднимает предоплату.",
  shortage: "При приёмке меньше, чем в накладной. Типовой обход: акт расхождения + зачёт + довоз, а не «подпишите как есть».",
  quality: "Партия не бьётся со спецификацией/паспортом. Нужны фото, акт, иногда лаборатория. Без доказательств платформа претензию не берёт.",
  docs: "Нет УПД или расхождение с отгрузкой. Без закрывающих сделка «закрыта» только на бумаге склада.",
  stock_miss: "Свободный остаток в каталоге оказался призраком. 28–33% B2B-заказов ломаются из-за неверного стока.",
  force_majeure: "Погода, простой комбината, перекрытая трасса. Рейтинг не трогаем, если есть документ; иначе это обычный срыв.",
};

export function openIncident(
  order: Order,
  kind: IncidentKind,
  raisedBy: Incident["raisedBy"],
  delayDays = 2,
): Order {
  if (order.status === "settled" || order.status === "cancelled") return order;
  if ((order.incidents ?? []).some((i) => i.kind === kind && i.status !== "resolved")) return order;
  const incident: Incident = {
    id: uid("inc"),
    orderId: order.id,
    kind,
    raisedBy,
    at: new Date().toISOString(),
    status: "negotiating",
    fact: FACT[kind],
    delayDays,
    proposed: proposeRemedy(kind, delayDays, order.total),
  };
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
        text: `Инцидент «${INCIDENT_LABEL[kind]}». Агент предлагает: ${incident.proposed.text}`,
      },
    ],
    playback: false,
  };
}

export function acceptRemedy(order: Order, incidentId: string): Order {
  const inc = order.incidents.find((i) => i.id === incidentId);
  if (!inc || inc.status === "resolved") return order;
  let invoices = order.invoices;
  if (inc.proposed.amount && (inc.proposed.kind === "price_cut" || inc.proposed.kind === "credit_note")) {
    invoices = invoices.map((inv) =>
      inv.kind === "remainder" && inv.status !== "paid"
        ? { ...inv, amount: Math.max(0, inv.amount - (inc.proposed.amount ?? 0)) }
        : inv,
    );
  }
  if (inc.proposed.amount && inc.proposed.kind === "penalty_hold") {
    invoices = invoices.map((inv) =>
      inv.kind === "remainder" && inv.status !== "paid"
        ? { ...inv, amount: inv.amount + (inc.proposed.amount ?? 0) }
        : inv,
    );
  }
  const etaBump = inc.proposed.extraDays ?? 0;
  return {
    ...order,
    invoices,
    shipments: order.shipments.map((s) =>
      etaBump && s.status !== "arrived" ? { ...s, etaDays: s.etaDays + etaBump } : s,
    ),
    incidents: order.incidents.map((i) =>
      i.id === incidentId ? { ...i, status: "resolved" as const, resolution: `Принято: ${i.proposed.text}` } : i,
    ),
    events: [
      ...order.events,
      {
        id: uid("ev"),
        at: new Date().toISOString(),
        delayMs: 0,
        stage: "dispute",
        text: "Стороны приняли обход без эскалации на площадку. Так закрывается большая часть претензий в первые дни.",
      },
    ],
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
            resolution: "Эскалация на Atrium. Решение площадки по доказательствам в заказе (переписка, накладная, УПД), не по устным договорённостям.",
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
        text: "Площадка вошла как арбитр. Без документов в контуре претензия не защищена.",
      },
    ],
  };
}

export function platformResolve(
  order: Order,
  incidentId: string,
  reputations: Record<string, TrustScore>,
): { order: Order; reputations: Record<string, TrustScore> } {
  const inc = order.incidents.find((i) => i.id === incidentId);
  if (!inc) return { order, reputations };
  const sellerHit = inc.kind === "delay_pay" ? "buyer" : "seller";
  const targetId = sellerHit === "buyer" ? order.buyerId : order.sellerId;
  const nextRep =
    inc.kind === "force_majeure"
      ? reputations
      : {
          ...reputations,
          [targetId]: applyTrustHit(trustOf(targetId, reputations), inc.kind, sellerHit),
        };
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
                  : `Решение Atrium: обход принят, рейтинг ${sellerHit === "buyer" ? "закупщика" : "поставщика"} обновлён.`,
            }
          : i,
      ),
    },
  };
}
