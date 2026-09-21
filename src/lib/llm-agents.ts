import { companyById, productById } from "./agents";
import { agentChat, extractJson } from "./llm";
import { parseNeed } from "./parse-need";
import type { Deal, Need } from "./types";

const CATEGORIES = [
  "Упаковка",
  "Металлопрокат",
  "Электроника",
  "Химия",
  "Спецодежда",
  "Пиломатериалы",
];

export async function enrichNeed(query: string, model: string): Promise<Need> {
  const fallback = parseNeed(query);
  try {
    const { text: raw } = await agentChat({
      model,
      timeoutMs: 18_000,
      system:
        "Ты парсер B2B-заявки. Верни только JSON. Не выдумывай числа, которых нет в тексте. budget — целые рубли, qty — число.",
      prompt: `Заявка: «${query}»
Категории: ${CATEGORIES.join(", ")}
JSON: {"category":string|null,"keywords":string[],"qty":number|null,"unit":string|null,"budget":number|null,"city":string|null,"deadlineDays":number|null}`,
    });
    const parsed = extractJson(raw) as Partial<{
      category: string | null;
      keywords: string[];
      qty: number | null;
      unit: string | null;
      budget: number | null;
      city: string | null;
      deadlineDays: number | null;
    }>;
    const need: Need = { ...fallback, query };
    if (!need.category && parsed.category && CATEGORIES.includes(parsed.category)) {
      need.category = parsed.category;
    }
    if (Array.isArray(parsed.keywords)) {
      need.keywords = Array.from(new Set([...need.keywords, ...parsed.keywords.map(String).slice(0, 8)]));
    }
    if (need.qty == null && typeof parsed.qty === "number" && parsed.qty > 0) need.qty = parsed.qty;
    if (!need.unit && parsed.unit) need.unit = parsed.unit;
    if (need.budget == null && typeof parsed.budget === "number" && parsed.budget > 0) need.budget = parsed.budget;
    if (!need.city && parsed.city) need.city = parsed.city;
    if (need.deadlineDays == null && typeof parsed.deadlineDays === "number" && parsed.deadlineDays > 0) {
      need.deadlineDays = parsed.deadlineDays;
    }
    return need;
  } catch {
    return fallback;
  }
}

export async function parseBuyerNeed(query: string, model: string) {
  const rules = parseNeed(query);
  const need = await enrichNeed(query, model);
  const llm =
    need.category !== rules.category ||
    need.qty !== rules.qty ||
    need.budget !== rules.budget ||
    need.city !== rules.city ||
    need.unit !== rules.unit ||
    need.deadlineDays !== rules.deadlineDays ||
    need.keywords.join("\0") !== rules.keywords.join("\0");
  return { need, rules, llm };
}

export async function voiceDeals(deals: Deal[], model: string): Promise<Deal[]> {
  if (deals.length === 0) return deals;
  const payload = deals.map((d) => {
    const product = productById(d.productId);
    const buyer = companyById(d.buyerId);
    const seller = companyById(d.sellerId);
    return {
      id: d.id,
      status: d.status,
      product: product.name,
      qty: d.qty,
      unit: product.unit,
      unitPrice: d.currentPrice,
      list: d.listPrice,
      prepayPct: d.prepayPct,
      incoterm: d.incoterm,
      destination: d.destination,
      lots: d.matchReasons,
      buyer: { company: buyer.short, agent: buyer.agent.name, mandate: buyer.agent.mandate, tone: buyer.agent.tone },
      seller: { company: seller.short, agent: seller.agent.name, mandate: seller.agent.mandate, tone: seller.agent.tone },
      speakers: d.messages.map((m) => m.from),
      draft: d.messages.map((m) => m.text),
    };
  });

  try {
    const { text: raw, model: voicedModel } = await agentChat({
      model,
      timeoutMs: 40_000,
      system:
        "Ты пишешь реплики B2B-агентов на русском: закупка и поставка оптом, партии, паллеты, счета, самовывоз или доставка до покупателя. Цифры, статусы и порядок реплик из черновика менять нельзя. Не добавляй и не удаляй реплики. Не называй пол цены или маржу продавца, если их нет в черновике. Стиль — деловая переписка, без канцелярита и без эмодзи. Верни JSON.",
      prompt: `Перепиши тексты реплик, сохранив смысл и все числа.
Вход: ${JSON.stringify(payload)}
Выход: {"deals":[{"id":"...","texts":["..."]}]}
texts.length === draft.length для каждой сделки.`,
    });
    const parsed = extractJson(raw) as { deals?: { id: string; texts: string[] }[] };
    const byId = new Map((parsed.deals ?? []).map((x) => [x.id, x.texts]));
    return deals.map((d) => {
      const texts = byId.get(d.id);
      if (!texts || texts.length !== d.messages.length) return { ...d, voicedBy: undefined };
      return {
        ...d,
        voicedBy: voicedModel,
        messages: d.messages.map((m, i) => ({
          ...m,
          text: String(texts[i] ?? m.text).slice(0, 800),
        })),
      };
    });
  } catch {
    return deals;
  }
}
