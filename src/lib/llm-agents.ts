import { companyById, productById } from "./agents";
import { extractJson, ollamaChat } from "./ollama";
import { parseNeed, PLATFORM_CATEGORIES } from "./parse-need";
import type { Deal, Need } from "./types";

export async function enrichNeed(query: string, model: string): Promise<Need> {
  const { need } = await parseBuyerNeed(query, model);
  return need;
}

export async function parseBuyerNeed(
  query: string,
  model: string,
): Promise<{ need: Need; rules: Need; llm: boolean }> {
  const rules = parseNeed(query);
  try {
    const raw = await ollamaChat({
      model,
      timeoutMs: 25_000,
      system:
        "Ты парсер B2B-заявки. Верни только JSON. Не выдумывай числа, которых нет в тексте. budget — целые рубли, qty — число.",
      prompt: `Заявка: «${query}»
Категории: ${PLATFORM_CATEGORIES.join(", ")}
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
    const need: Need = { ...rules, query };
    if (!need.category && parsed.category && PLATFORM_CATEGORIES.includes(parsed.category)) {
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
    return { need, rules, llm: true };
  } catch {
    return { need: rules, rules, llm: false };
  }
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
      buyer: { company: buyer.short, agent: buyer.agent.name, tone: buyer.agent.tone, tactic: d.buyerTactic },
      seller: { company: seller.short, agent: seller.agent.name, tone: seller.agent.tone, tactic: d.sellerTactic },
      speakers: d.messages.map((m) => m.from),
      draft: d.messages.map((m) => m.text),
    };
  });

  try {
    const raw = await ollamaChat({
      model,
      timeoutMs: 90_000,
      system:
        "Ты пишешь реплики B2B-агентов на русском: закупка и поставка оптом. Цифры оферты, qty, предоплату и порядок реплик не меняй. Не добавляй и не удаляй реплики. Не называй пол цены, процент маржи, бюджет и потолок другой стороны — это не для комнаты. Если в черновике они есть, вырежи. Стиль — деловая переписка, без эмодзи. Верни JSON.",
      prompt: `Перепиши тексты реплик. Оферты и числа сделок оставь. Пол, маржу и чужой бюджет не пиши.
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
        voicedBy: model,
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
