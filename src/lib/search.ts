import type { Company } from "./types";

/** Fold org names so «ВолгаРитэйл» matches «Волга Ритейл». */
export function foldOrg(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/э/g, "е")
    .replace(/[^a-zа-я0-9]+/giu, "");
}

export function companyMatchesQuery(company: Company, query: string): boolean {
  const raw = query.trim();
  if (!raw) return true;
  const folded = foldOrg(raw);
  if (!folded) return true;
  const hay = foldOrg(
    [
      company.id,
      company.name,
      company.short,
      company.city,
      company.inn,
      company.industry,
      company.blurb,
      company.agent.name,
    ].join(" "),
  );
  if (hay.includes(folded)) return true;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 4 && company.inn.includes(digits);
}
