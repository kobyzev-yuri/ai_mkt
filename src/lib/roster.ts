import { companies as seedCompanies } from "./seed";
import type { Company } from "./types";

let extra: Company[] = [];

export function allCompanies(): Company[] {
  const map = new Map(seedCompanies.map((c) => [c.id, c]));
  for (const c of extra) map.set(c.id, c);
  return [...map.values()];
}

export function mergeCompanies(rows: Company[]) {
  extra = rows.filter((c) => !seedCompanies.some((s) => s.id === c.id));
}
