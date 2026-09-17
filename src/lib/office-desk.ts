import { DEMO_1C_CSV, SKIP_OWNER_LABEL, adapt1CRows, parse1CCsv, type AdaptSkip } from "./lot-adapter";
import { SELLER_ID } from "./seed";
import type { Incident, Order, Product } from "./types";

export interface PlatformDispute {
  order: Order;
  incident: Incident;
}

export function openDisputes(orders: Order[]): PlatformDispute[] {
  const rows: PlatformDispute[] = [];
  for (const order of orders) {
    for (const incident of order.incidents ?? []) {
      if (incident.status === "resolved") continue;
      rows.push({ order, incident });
    }
  }
  return rows.sort((a, b) => {
    const ae = a.incident.status === "escalated" ? 0 : 1;
    const be = b.incident.status === "escalated" ? 0 : 1;
    return ae - be;
  });
}

export function paymentWatch(orders: Order[]): Order[] {
  return orders.filter((o) => o.status === "advance_due" || o.status === "remainder_due");
}

export function platformOnboarding(catalog?: Product[]): AdaptSkip[] {
  const { skipped } = adapt1CRows(parse1CCsv(DEMO_1C_CSV), SELLER_ID, catalog);
  return skipped.filter((s) => s.issues.some((i) => i.owner === "platform"));
}

export { SKIP_OWNER_LABEL };
