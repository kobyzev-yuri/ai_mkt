"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createRfq as runRfq } from "./agents";
import { applyAcceptance, applyAdvancePayment, applyRemainderPayment, createOrderFromDeal } from "./fulfillment";
import { uid } from "./ids";
import { acceptRemedy, escalateIncident, openIncident, platformResolve } from "./ops";
import { BUYER_ID, SELLER_ID, companies, DEMO_PROMPTS, lots as seedLots, seedDeals, seedOrders, seedRfqs } from "./seed";
import { DEFAULT_MODEL } from "./ollama";
import { seedTrust } from "./trust";
import type { AuditEvent, Company, Deal, IncidentKind, MarketplaceState, Order, Rfq } from "./types";

const KEY = "atrium-marketplace-v4";

const initial: MarketplaceState = {
  currentCompanyId: BUYER_ID,
  llmModel: DEFAULT_MODEL,
  rfqs: seedRfqs,
  deals: seedDeals,
  orders: seedOrders,
  lots: seedLots.map((l) => ({ ...l })),
  reputations: { ...seedTrust },
  auditLog: [],
  lastBuyerId: BUYER_ID,
  lastSellerId: SELLER_ID,
};

function hydrate(parsed: Partial<MarketplaceState> & { currentCompanyId: string }): MarketplaceState {
  return {
    currentCompanyId: parsed.currentCompanyId,
    llmModel: parsed.llmModel || DEFAULT_MODEL,
    rfqs: parsed.rfqs ?? seedRfqs,
    deals: parsed.deals ?? seedDeals,
    orders: (parsed.orders ?? seedOrders).map((o) => ({ ...o, incidents: o.incidents ?? [] })),
    lots: parsed.lots ?? seedLots.map((l) => ({ ...l })),
    reputations: parsed.reputations ?? { ...seedTrust },
    auditLog: parsed.auditLog ?? [],
    lastBuyerId: parsed.lastBuyerId ?? BUYER_ID,
    lastSellerId: parsed.lastSellerId ?? SELLER_ID,
  };
}

let memory: MarketplaceState = initial;
const listeners = new Set<() => void>();

function readPersisted(): MarketplaceState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<MarketplaceState> & { currentCompanyId?: string };
    if (parsed?.rfqs && parsed?.deals && parsed?.orders && parsed?.lots && parsed.currentCompanyId) {
      return hydrate({ ...parsed, currentCompanyId: parsed.currentCompanyId });
    }
  } catch {
    /* keep seed */
  }
  return initial;
}

if (typeof window !== "undefined") {
  memory = readPersisted();
}

function emit() {
  for (const listener of listeners) listener();
}

function persist(next: MarketplaceState) {
  memory = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  emit();
}

function withAudit(state: MarketplaceState, entries: Omit<AuditEvent, "id" | "at">[]): MarketplaceState {
  const now = new Date().toISOString();
  return {
    ...state,
    auditLog: [
      ...entries.map((e) => ({ ...e, id: uid("aud"), at: now })),
      ...state.auditLog,
    ].slice(0, 120),
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return memory;
}

function getServerSnapshot() {
  return initial;
}

type Store = MarketplaceState & {
  hydrated: boolean;
  company: Company;
  setCompany: (id: string) => void;
  launchRfq: (query: string) => Promise<{ rfq: Rfq; deals: Deal[]; llm: boolean; model: string }>;
  prepareShowcase: (query?: string) => { rfq: Rfq; deals: Deal[] };
  setLlmModel: (id: string) => void;
  approveDeal: (id: string) => string | undefined;
  rejectDeal: (id: string) => void;
  payAdvance: (orderId: string) => void;
  acceptDelivery: (orderId: string) => void;
  payRemainder: (orderId: string) => void;
  reportIncident: (orderId: string, kind: IncidentKind) => string | undefined;
  acceptIncidentRemedy: (orderId: string, incidentId: string) => void;
  escalateOrderIncident: (orderId: string, incidentId: string) => void;
  resolveOnPlatform: (orderId: string, incidentId: string) => void;
  resetDemo: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const company = useMemo(
    () => companies.find((c) => c.id === state.currentCompanyId) ?? companies[0],
    [state.currentCompanyId],
  );

  const setCompany = useCallback((id: string) => {
    const next = companies.find((c) => c.id === id);
    persist({
      ...memory,
      currentCompanyId: id,
      lastBuyerId: next && next.role !== "seller" ? id : memory.lastBuyerId,
      lastSellerId: next && next.role !== "buyer" ? id : memory.lastSellerId,
    });
  }, []);

  const setLlmModel = useCallback((id: string) => {
    persist({ ...memory, llmModel: id });
  }, []);

  const launchRfq = useCallback(async (query: string) => {
    try {
      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          buyerId: memory.currentCompanyId,
          model: memory.llmModel,
          reputations: memory.reputations,
        }),
      });
      if (!res.ok) throw new Error("rfq api");
      const data = (await res.json()) as { rfq: Rfq; deals: Deal[]; llm?: boolean; model?: string };
      persist(
        withAudit(
          { ...memory, rfqs: [data.rfq, ...memory.rfqs], deals: [...data.deals, ...memory.deals] },
          [
            { actor: "parser", action: "Разбор потребности", detail: query.slice(0, 220) },
            {
              actor: "matcher",
              action: "Открыты комнаты",
              detail: `${data.deals.length} поставщиков`,
              ref: data.rfq.id,
            },
            {
              actor: "mandate",
              action: "Торг в мандате",
              detail: data.deals
                .map((d) => `${d.status} · ${d.currentPrice} ₽ · пол ${d.floorPrice} ₽`)
                .join("; ")
                .slice(0, 280),
              constraint: "LLM не меняет цену, qty и статус",
            },
          ],
        ),
      );
      return { rfq: data.rfq, deals: data.deals, llm: Boolean(data.llm), model: data.model ?? memory.llmModel };
    } catch {
      const { rfq, deals } = runRfq(memory.currentCompanyId, query, undefined, memory.reputations);
      persist(
        withAudit(
          { ...memory, rfqs: [rfq, ...memory.rfqs], deals: [...deals, ...memory.deals] },
          [
            { actor: "parser", action: "Разбор без LLM", detail: query.slice(0, 220) },
            { actor: "matcher", action: "Открыты комнаты", detail: `${deals.length} поставщиков`, ref: rfq.id },
          ],
        ),
      );
      return { rfq, deals, llm: false, model: memory.llmModel };
    }
  }, []);

  const prepareShowcase = useCallback((query?: string) => {
    const q = (query ?? DEMO_PROMPTS[0]).trim() || DEMO_PROMPTS[0];
    const { rfq, deals } = runRfq(BUYER_ID, q, undefined, memory.reputations);
    const silenced = deals.map((d) => ({ ...d, playback: false }));
    persist(
      withAudit(
        {
          ...memory,
          currentCompanyId: BUYER_ID,
          rfqs: [rfq, ...memory.rfqs],
          deals: [...silenced, ...memory.deals],
        },
        [
          {
            actor: "orchestrator",
            action: "Сценарий S1",
            detail: "Закупка партии: разбор → подбор → торг → подтверждение человека",
            ref: rfq.id,
          },
          { actor: "parser", action: "Потребность", detail: q },
          { actor: "matcher", action: "Комнаты", detail: `${silenced.length} поставщиков`, ref: rfq.id },
        ],
      ),
    );
    return { rfq, deals: silenced };
  }, []);

  const approveDeal = useCallback((id: string) => {
    const deal = memory.deals.find((d) => d.id === id);
    if (!deal) return undefined;
    const rfq = memory.rfqs.find((r) => r.id === deal.rfqId);
    const { order, lots } = createOrderFromDeal(deal, rfq, memory.lots);
    const deals = memory.deals.map((d) =>
      d.id === id ? { ...d, status: "approved" as const, playback: false, orderId: order.id } : d,
    );
    const rfqs = memory.rfqs.map((r) =>
      r.id === deal.rfqId ? { ...r, status: "awarded" as const, awardedDealId: id } : r,
    );
    persist(
      withAudit(
        { ...memory, deals, rfqs, orders: [order, ...memory.orders], lots },
        [
          {
            actor: "human",
            action: "Утверждение сделки",
            detail: `Заказ ${order.id}, аванс ${deal.prepayPct}%`,
            constraint: "Агенты не могут утвердить сделку сами",
            ref: order.id,
          },
          {
            actor: "orchestrator",
            action: "Сценарий S2",
            detail: "Исполнение: счёт → резерв → отгрузка. Склад ждёт аванс.",
            ref: order.id,
          },
        ],
      ),
    );
    return order.id;
  }, []);

  const rejectDeal = useCallback((id: string) => {
    persist(
      withAudit(
        {
          ...memory,
          deals: memory.deals.map((d) => (d.id === id ? { ...d, status: "rejected" as const, playback: false } : d)),
        },
        [{ actor: "human", action: "Отклонение сделки", detail: id, ref: id }],
      ),
    );
  }, []);

  const patchOrder = (orderId: string, next: Order, entries: Omit<AuditEvent, "id" | "at">[]) => {
    persist(
      withAudit(
        {
          ...memory,
          orders: memory.orders.map((o) => (o.id === orderId ? next : o)),
        },
        entries,
      ),
    );
  };

  const payAdvance = useCallback((orderId: string) => {
    const order = memory.orders.find((o) => o.id === orderId);
    if (!order || order.status !== "advance_due") return;
    patchOrder(orderId, applyAdvancePayment(order), [
      {
        actor: "human",
        action: "Оплата аванса",
        detail: "Казначейство провело платёж. Склад резервирует лоты.",
        constraint: "Без аванса отгрузки нет",
        ref: orderId,
      },
          { actor: "fulfillment", action: "Резерв и накладная", detail: "Партии зарезервированы, УПД в контуре", ref: orderId },
    ]);
  }, []);

  const acceptDelivery = useCallback((orderId: string) => {
    const order = memory.orders.find((o) => o.id === orderId);
    if (!order || (order.status !== "in_transit" && order.status !== "delivered" && order.status !== "acceptance_due")) {
      return;
    }
    patchOrder(orderId, applyAcceptance({ ...order, playback: false, status: "acceptance_due" }), [
      {
        actor: "human",
        action: "Приёмка",
        detail: "Акт подписан, выставлен остаток",
        constraint: "Агенты не подписывают приёмку",
        ref: orderId,
      },
    ]);
  }, []);

  const payRemainder = useCallback((orderId: string) => {
    const order = memory.orders.find((o) => o.id === orderId);
    if (!order || order.status !== "remainder_due") return;
    patchOrder(orderId, applyRemainderPayment(order), [
      { actor: "human", action: "Оплата остатка", detail: "Контур закрыт", ref: orderId },
    ]);
  }, []);

  const reportIncident = useCallback((orderId: string, kind: IncidentKind) => {
    const order = memory.orders.find((o) => o.id === orderId);
    if (!order) return undefined;
    const raisedBy =
      memory.currentCompanyId === order.buyerId
        ? "buyer"
        : memory.currentCompanyId === order.sellerId
          ? "seller"
          : "system";
    const next = openIncident(order, kind, raisedBy);
    const created = next.incidents.find((i) => i.kind === kind && i.status !== "resolved") ?? next.incidents.at(-1);
    patchOrder(orderId, next, [
      {
        actor: "ops",
        action: "Сценарий S3",
        detail: `Факт «${kind}». Агент предлагает обход, рейтинг пока не трогаем.`,
        ref: orderId,
      },
    ]);
    return created?.id;
  }, []);

  const acceptIncidentRemedy = useCallback((orderId: string, incidentId: string) => {
    const order = memory.orders.find((o) => o.id === orderId);
    if (!order) return;
    patchOrder(orderId, acceptRemedy(order, incidentId), [
      { actor: "ops", action: "Обход принят", detail: "Без эскалации, рейтинг не изменён", ref: orderId },
    ]);
  }, []);

  const escalateOrderIncident = useCallback((orderId: string, incidentId: string) => {
    const order = memory.orders.find((o) => o.id === orderId);
    if (!order) return;
    patchOrder(orderId, escalateIncident(order, incidentId), [
      { actor: "human", action: "Эскалация", detail: "Площадка входит как арбитр", ref: orderId },
    ]);
  }, []);

  const resolveOnPlatform = useCallback((orderId: string, incidentId: string) => {
    const order = memory.orders.find((o) => o.id === orderId);
    if (!order) return;
    const next = platformResolve(order, incidentId, memory.reputations);
    persist(
      withAudit(
        {
          ...memory,
          orders: memory.orders.map((o) => (o.id === orderId ? next.order : o)),
          reputations: next.reputations,
        },
        [
          {
            actor: "platform",
            action: "Решение Atrium",
            detail: "Обход зафиксирован, рейтинг обновлён по документам в заказе",
            constraint: "Удар по баллу только после арбитража",
            ref: orderId,
          },
        ],
      ),
    );
  }, []);

  const resetDemo = useCallback(() => {
    persist({
      currentCompanyId: BUYER_ID,
      llmModel: memory.llmModel || DEFAULT_MODEL,
      rfqs: seedRfqs,
      deals: seedDeals,
      orders: seedOrders,
      lots: seedLots.map((l) => ({ ...l })),
      reputations: { ...seedTrust },
      auditLog: [],
      lastBuyerId: BUYER_ID,
      lastSellerId: SELLER_ID,
    });
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value: Store = {
    ...state,
    hydrated: true,
    company,
    setCompany,
    setLlmModel,
    launchRfq,
    prepareShowcase,
    approveDeal,
    rejectDeal,
    payAdvance,
    acceptDelivery,
    payRemainder,
    reportIncident,
    acceptIncidentRemedy,
    escalateOrderIncident,
    resolveOnPlatform,
    resetDemo,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}
