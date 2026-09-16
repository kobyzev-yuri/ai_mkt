import { compactRub, num, rub } from "./format";
import { freeQty, lotsForProduct } from "./inventory";
import { packingOf, snapToPack } from "./packing";
import { allProducts } from "./catalog";
import { lots as seedLots } from "./seed";
import type { Lot, Need, Product } from "./types";

/** Catalog list is the public market mark. Floor stays out of the buyer insurance screen. */
const ABOVE_MARKET = 1.06;
const BELOW_LIST = 0.92;

export type PreviewTone = "terra" | "brass";

export interface MandatePreview {
  productName?: string;
  unit?: string;
  snappedQty?: number;
  unitCap?: number;
  list?: number;
  available?: number;
  lines: { tone: PreviewTone; text: string }[];
}

function pickProduct(need: Need): Product | undefined {
  const pool = need.category ? allProducts().filter((p) => p.category === need.category) : allProducts();
  if (!pool.length) return undefined;
  const keys = [
    ...need.keywords,
    ...need.query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2),
  ].map((k) => k.toLowerCase());
  let best: Product | undefined;
  let bestHits = -1;
  for (const product of pool) {
    if (need.unit && product.unit !== need.unit) continue;
    const blob = `${product.name} ${product.tags.join(" ")} ${product.sku}`.toLowerCase();
    const hits = keys.filter((k) => blob.includes(k)).length;
    if (hits > bestHits) {
      best = product;
      bestHits = hits;
    }
  }
  return best ?? pool.find((p) => !need.unit || p.unit === need.unit) ?? pool[0];
}

export function mandatePreview(need: Need, lots: Lot[] = seedLots): MandatePreview {
  const lines: MandatePreview["lines"] = [];
  const product = pickProduct(need);
  if (!product) return { lines };

  const rawQty = need.qty ?? product.moq;
  const snappedQty = snapToPack(rawQty, product);
  const pack = packingOf(product);
  const available = lotsForProduct(lots, product.id).reduce((s, l) => s + freeQty(l), 0);
  const list = product.price;
  const unitCap = need.budget && snappedQty ? need.budget / snappedQty : undefined;

  if (need.qty && snappedQty !== need.qty) {
    lines.push({
      tone: "brass",
      text: `Объём ${num(need.qty)} ${product.unit} округлим к кратности: ${num(snappedQty)} ${product.unit} (${pack.packSize} ${pack.packUnit}).`,
    });
  }
  if (snappedQty > available) {
    lines.push({
      tone: "terra",
      text: `На витрине свободно ${num(available)} ${product.unit} «${product.name}», в заявке ${num(snappedQty)}. Продавца с таким объёмом может не быть — снизьте qty до поиска.`,
    });
  }
  if (unitCap != null) {
    const overPct = Math.round((unitCap / list - 1) * 100);
    if (unitCap > list * ABOVE_MARKET) {
      lines.push({
        tone: "terra",
        text: `Потолок заявки ${rub(unitCap)}/${product.unit} при ${num(snappedQty)} ${product.unit} и ориентире ${compactRub(need.budget!)}. Лист витрины ${rub(list)}/${product.unit} — вы разрешаете переплатить ${overPct}% к рынку. Проверьте объём или бюджет.`,
      });
    } else if (unitCap < list * BELOW_LIST) {
      lines.push({
        tone: "terra",
        text: `Потолок заявки ${rub(unitCap)}/${product.unit} ниже листа витрины ${rub(list)}/${product.unit}. Торг в мандате скорее не сойдётся — поднимите ориентир или снизьте объём.`,
      });
    } else {
      lines.push({
        tone: "brass",
        text: `Потолок заявки ${rub(unitCap)}/${product.unit} при ${num(snappedQty)} ${product.unit}. Лист витрины «${product.name}»: ${rub(list)}/${product.unit}. Пол поставщика в эту карточку не входит.`,
      });
    }
  }

  return {
    productName: product.name,
    unit: product.unit,
    snappedQty,
    unitCap,
    list,
    available,
    lines,
  };
}
