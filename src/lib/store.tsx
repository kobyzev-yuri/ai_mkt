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
import { acceptRemedy, escalateIncident, openIncident, platformResolve } from "./ops";
import { BUYER_ID, companies, lots as seedLots, seedDeals, seedOrders, seedRfqs } from "./seed";
import { DEFAULT_MODEL } from "./ollama";
import { seedTrust } from "./trust";
import type { Company, Deal, IncidentKind, MarketplaceState, Order, Rfq } from "./types";

const KEY = "atrium-marketplace-v3";

const initial: MarketplaceState = {
  currentCompanyId: BUYER_ID,
  llmModel: DEFAULT_MODEL,
  rfqs: seedRfqs,
  deals: seedDeals,
  orders: seedOrders,
  lots: seedLots.map((l) => ({ ...l })),
  reputations: { ...seedTrust },
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
  setLlmModel: (id: string) => void;
  approveDeal: (id: string) => string | undefined;
  rejectDeal: (id: string) => void;
  payAdvance: (orderId: string) => void;
  acceptDelivery: (orderId: string) => void;
  payRemainder: (orderId: string) => void;
  reportIncident: (orderId: string, kind: IncidentKind) => void;
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
    persist({ ...memory, currentCompanyId: id });
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
        }),
      });
      if (!res.ok) throw new Error("rfq api");
      const data = (await res.json()) as { rfq: Rfq; deals: Deal[]; llm?: boolean; model?: string };
      persist({ ...memory, rfqs: [data.rfq, ...memory.rfqs], deals: [...data.deals, ...memory.deals] });
      return { rfq: data.rfq, deals: data.deals, llm: Boolean(data.llm), model: data.model ?? memory.llmModel };
    } catch {
      const { rfq, deals } = runRfq(memory.currentCompanyId, query);
      persist({ ...memory, rfqs: [rfq, ...memory.rfqs], deals: [...deals, ...memory.deals] });
      return { rfq, deals, llm: false, model: memory.llmModel };
    }
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
    persist({ ...memory, deals, rfqs, orders: [order, ...memory.orders], lots });
    return order.id;
  }, []);

  const rejectDeal = useCallback((id: string) => {
    persist({
      ...memory,
      deals: memory.deals.map((d) => (d.id === id ? { ...d, status: "rejected" as const, playback: false } : d)),
    });
  }, []);

  const patchOrder = (orderId: string, next: Order) => {
    persist({
      ...memory,
      orders: memory.orders.map((o) => (o.id === orderId ? next : o)),
    });
  };

  const payAdvance = useCallback((orderId: string) => {
    const order = memory.orders.find((o) => o.id === orderId);
    if (!order || order.status !== "advance_due") return;
    patchOrder(orderId, applyAdvancePayment(order));
  }, []);

  const acceptDelivery = useCallback((orderId: string) => {
    const order = memory.orders.find((o) => o.id === orderId);
    if (!order || (order.status !== "in_transit" && order.status !== "delivered" && order.status !== "acceptance_due")) {
      return;
    }
    patchOrder(orderId, applyAcceptance({ ...order, playback: false, status: "acceptance_due" }));
  }, []);

  const payRemainder = useCallback((orderId: string) => {
    const order = memory.orders.find((o) => o.id === orderId);
    if (!order || order.status !== "remainder_due") return;
    patchOrder(orderId, applyRemainderPayment(order));
  }, []);

  const reportIncident = useCallback((orderId: string, kind: IncidentKind) => {
    const order = memory.orders.find((o) => o.id === orderId);
    if (!order) return;
    const raisedBy =
      memory.currentCompanyId === order.buyerId
        ? "buyer"
        : memory.currentCompanyId === order.sellerId
          ? "seller"
          : "system";
    patchOrder(orderId, openIncident(order, kind, raisedBy));
  }, []);

  const acceptIncidentRemedy = useCallback((orderId: string, incidentId: string) => {
    const order = memory.orders.find((o) => o.id === orderId);
    if (!order) return;
    patchOrder(orderId, acceptRemedy(order, incidentId));
  }, []);

  const escalateOrderIncident = useCallback((orderId: string, incidentId: string) => {
    const order = memory.orders.find((o) => o.id === orderId);
    if (!order) return;
    patchOrder(orderId, escalateIncident(order, incidentId));
  }, []);

  const resolveOnPlatform = useCallback((orderId: string, incidentId: string) => {
    const order = memory.orders.find((o) => o.id === orderId);
    if (!order) return;
    const next = platformResolve(order, incidentId, memory.reputations);
    persist({
      ...memory,
      orders: memory.orders.map((o) => (o.id === orderId ? next.order : o)),
      reputations: next.reputations,
    });
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
