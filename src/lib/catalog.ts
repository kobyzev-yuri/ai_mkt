import { products as seedProducts } from "./seed";
import type { Product } from "./types";

let extra: Product[] = [];
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  for (const fn of listeners) fn();
}

export function allProducts(): Product[] {
  const map = new Map(seedProducts.map((p) => [p.id, p]));
  for (const p of extra) map.set(p.id, p);
  return [...map.values()];
}

export function mergeListings(listings: Product[]) {
  extra = listings.filter((p) => !seedProducts.some((s) => s.id === p.id));
  emit();
}

export function subscribeCatalog(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function catalogVersion(): number {
  return version;
}

function getServerSnapshot() {
  return 0;
}

export { getServerSnapshot as catalogServerSnapshot };
