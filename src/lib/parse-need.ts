import type { Need } from "./types";

const CITIES = [
  "Казань",
  "Москва",
  "Самара",
  "Челябинск",
  "Нижний Новгород",
  "Иваново",
  "Киров",
  "Саратов",
  "Екатеринбург",
  "Подольск",
];

const CATEGORY_HINTS: { category: string; keys: string[] }[] = [
  { category: "Упаковка", keys: ["короб", "крафт", "плёнк", "пленк", "стретч", "паллет", "упаков"] },
  { category: "Металлопрокат", keys: ["арматур", "а500", "лист", "труба", "прокат", "уголок", "металл"] },
  { category: "Электроника", keys: ["контроллер", "датчик", "modbus", "питани", "rs-485", "pt100"] },
  { category: "Химия", keys: ["спирт", "изопропил", "гипохлорит", "сода", "хими"] },
  { category: "Спецодежда", keys: ["спецодежд", "комплект", "куртк", "ботин", "форма", "одежд"] },
  { category: "Пиломатериалы", keys: ["доска", "брус", "фанер", "пиломатер", "лес"] },
];

function parseNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export function parseNeed(query: string): Need {
  const q = query.toLowerCase();
  const need: Need = { query, keywords: [] };

  for (const city of CITIES) {
    if (q.includes(city.toLowerCase())) {
      need.city = city;
      break;
    }
  }

  for (const hint of CATEGORY_HINTS) {
    if (hint.keys.some((k) => q.includes(k))) {
      need.category = hint.category;
      need.keywords.push(...hint.keys.filter((k) => q.includes(k)));
      break;
    }
  }

  const extra = ["крафт", "зима", "лето", "а500", "12", "16", "300", "200", "150", "pt100", "modbus"];
  for (const k of extra) {
    if (q.includes(k) && !need.keywords.includes(k)) need.keywords.push(k);
  }

  const budgetMatch = q.match(
    /бюджет[^\d]{0,12}([\d\s]+(?:[.,]\d+)?)(?:\s*(млн|тыс|тысяч))?/i,
  ) ?? q.match(/(?:до|ориентир)[^\d]{0,8}([\d\s]+(?:[.,]\d+)?)(?:\s*(млн|тыс|тысяч))?/i);

  if (budgetMatch?.[1]) {
    let n = parseNumber(budgetMatch[1]) ?? 0;
    const unit = budgetMatch[2];
    if (unit?.startsWith("млн")) n *= 1_000_000;
    else if (unit) n *= 1_000;
    if (n > 0) need.budget = n;
  }

  const qtyMatch =
    q.match(
      /([\d\s]{2,9})\s*(тыс\.?)?\s*(шт|короб|комплект|тонн|\bт\b|кг|пар|лист|м³|м3)/i,
    ) ?? q.match(/нужно\s+([\d\s]{2,9})/i) ?? q.match(/ищем\s+([\d\s]{1,9})\s*(тонн)?/i);

  if (qtyMatch?.[1]) {
    let n = parseNumber(qtyMatch[1].trim()) ?? 0;
    if (qtyMatch[2]?.startsWith("тыс")) n *= 1000;
    if (n > 0) need.qty = n;
    const u = (qtyMatch[3] ?? qtyMatch[2] ?? "").toLowerCase();
    if (u.startsWith("короб") || u.startsWith("шт")) need.unit = "шт";
    else if (u.startsWith("комплект")) need.unit = "компл.";
    else if (u.startsWith("тонн") || u === "т") need.unit = "т";
    else if (u.startsWith("кг")) need.unit = "кг";
    else if (u.startsWith("пар")) need.unit = "пар";
    else if (u.startsWith("лист")) need.unit = "лист";
    else if (u.startsWith("м")) need.unit = "м³";
  }

  const dayMatch = q.match(/(\d+)\s*(?:раб(?:очих)?\s*)?дн/i) ?? q.match(/срок\s+(\d+)/i);
  if (dayMatch?.[1]) need.deadlineDays = Number(dayMatch[1]);

  const weekMatch = q.match(/(\d+)\s*недел/i);
  if (!need.deadlineDays && weekMatch?.[1]) need.deadlineDays = Number(weekMatch[1]) * 7;

  return need;
}
