import { companies } from "./seed";
import { trustOf } from "./trust";
import type { Company, CompanyRole, Deal, Order, TrustScore } from "./types";

export type WorkspaceId = "plaza" | "buy" | "sell" | "office";

export const WORKSPACES: { id: WorkspaceId; href: string; label: string; hint: string }[] = [
  { id: "plaza", href: "/", label: "Площадка", hint: "Витрина" },
  { id: "buy", href: "/buy", label: "Закупки", hint: "Кабинет закупщика" },
  { id: "sell", href: "/sell", label: "Поставки", hint: "Кабинет поставщика" },
  { id: "office", href: "/office", label: "Бэкофис", hint: "Платформа" },
];

export const SUBNAV: Record<WorkspaceId, { href: string; label: string }[]> = {
  plaza: [
    { href: "/", label: "Витрина" },
    { href: "/catalog", label: "Каталог" },
    { href: "/companies", label: "Участники" },
  ],
  buy: [
    { href: "/buy", label: "Кабинет" },
    { href: "/rfq", label: "Новая заявка" },
    { href: "/deals", label: "Сделки" },
    { href: "/orders", label: "Исполнение" },
  ],
  sell: [
    { href: "/sell", label: "Кабинет" },
    { href: "/deals", label: "Сделки" },
    { href: "/orders", label: "Исполнение" },
    { href: "/sell/catalog", label: "Витрина" },
  ],
  office: [
    { href: "/office", label: "Обзор" },
    { href: "/concept", label: "Идеология" },
    { href: "/demo", label: "Демо" },
    { href: "/trust", label: "Аналитика" },
    { href: "/office/settings", label: "Настройки" },
  ],
};

export function workspaceFromPath(pathname: string, role: CompanyRole = "buyer"): WorkspaceId {
  if (pathname.startsWith("/buy") || pathname.startsWith("/rfq")) return "buy";
  if (pathname.startsWith("/sell")) return "sell";
  if (
    pathname.startsWith("/office") ||
    pathname.startsWith("/concept") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/trust")
  ) {
    return "office";
  }
  if (pathname === "/" || pathname.startsWith("/catalog") || pathname.startsWith("/companies")) {
    return "plaza";
  }
  if (pathname.startsWith("/deals") || pathname.startsWith("/orders") || pathname.startsWith("/dashboard")) {
    return role === "seller" ? "sell" : "buy";
  }
  return "plaza";
}

export function companyFitsWorkspace(company: Company, ws: WorkspaceId): boolean {
  if (ws === "buy") return company.role !== "seller";
  if (ws === "sell") return company.role !== "buyer";
  return true;
}

export function companiesForWorkspace(ws: WorkspaceId): Company[] {
  if (ws === "buy") return companies.filter((c) => c.role !== "seller");
  if (ws === "sell") return companies.filter((c) => c.role !== "buyer");
  return companies;
}

export interface CounterpartyRow {
  company: Company;
  rooms: number;
  liveOrders: number;
  volume: number;
  trust: number;
}

export function counterpartiesOf(
  companyId: string,
  deals: Deal[],
  orders: Order[],
  reputations?: Record<string, TrustScore>,
): CounterpartyRow[] {
  const self = companies.find((c) => c.id === companyId);
  if (!self) return [];
  const asBuyer = self.role !== "seller";
  const tally = new Map<string, { rooms: number; liveOrders: number; volume: number }>();
  const bump = (id: string, patch: Partial<{ rooms: number; liveOrders: number; volume: number }>) => {
    const cur = tally.get(id) ?? { rooms: 0, liveOrders: 0, volume: 0 };
    tally.set(id, {
      rooms: cur.rooms + (patch.rooms ?? 0),
      liveOrders: cur.liveOrders + (patch.liveOrders ?? 0),
      volume: cur.volume + (patch.volume ?? 0),
    });
  };

  for (const d of deals) {
    if (asBuyer && d.buyerId === companyId) {
      bump(d.sellerId, { rooms: 1, volume: d.status === "approved" ? d.currentPrice * d.qty : 0 });
    }
    if (!asBuyer && d.sellerId === companyId) {
      bump(d.buyerId, { rooms: 1, volume: d.status === "approved" ? d.currentPrice * d.qty : 0 });
    }
  }
  for (const o of orders) {
    if (asBuyer && o.buyerId === companyId) {
      bump(o.sellerId, { liveOrders: o.status === "settled" ? 0 : 1, volume: o.status === "settled" ? o.total : 0 });
    }
    if (!asBuyer && o.sellerId === companyId) {
      bump(o.buyerId, { liveOrders: o.status === "settled" ? 0 : 1, volume: o.status === "settled" ? o.total : 0 });
    }
  }

  return [...tally.entries()]
    .map(([id, v]) => {
      const company = companies.find((c) => c.id === id);
      if (!company) return null;
      return {
        company,
        rooms: v.rooms,
        liveOrders: v.liveOrders,
        volume: v.volume,
        trust: trustOf(id, reputations).score,
      };
    })
    .filter((x): x is CounterpartyRow => Boolean(x))
    .sort((a, b) => b.volume - a.volume || b.rooms - a.rooms);
}
