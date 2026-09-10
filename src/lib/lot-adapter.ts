import { packingOf } from "./packing";
import { products } from "./seed";
import type { Lot } from "./types";

/** Typical 1C «Остатки складов» dump. Integrator owns the real connector. */
export const DEMO_1C_CSV = `Код;Наименование;Артикул;Остаток;Ед;Кратность;Цена;МинЦена;Склад;Город;СрокДней;Партия;Сертификаты
00-00018421;Короб четырёхклапанный 300х200х150 крафт;SP-300-K;62000;шт;1000;41,50;38,00;Казань, склад №3;Казань;0;СП-260908-К3;декларация ТР ТС
00-00018455;Короб 400х300х300 белый топлайнер;SP-400-W;18000;шт;500;66,00;61,00;Наб. Челны, площадка;Набережные Челны;2;СП-260901-Б;декларация ТР ТС
00-00019002;Стретч 20 мкм рукав 500;SP-ST20;8400;кг;50;165,00;152,00;Казань, склад №1;Казань;0;СП-260820-СТ;паспорт партии
00-00018499;Короб нестандарт 999×999;SP-XXX;5000;шт;500;55,00;;Казань, двор;Казань;5;СП-БЕЗ-ПОЛА;
00-00019910;Доставка фурой до склада клиента;;1;усл;1;18000,00;18000,00;Офис;Казань;1;УСЛ-ДОСТ;`;

export const ADAPTER_MAP: { theirs: string; ours: string; note: string }[] = [
  { theirs: "Артикул", ours: "product.sku", note: "карточка уже на площадке" },
  { theirs: "Остаток", ours: "lot.qty", note: "свободно, без резерва" },
  { theirs: "МинЦена", ours: "мандат.пол", note: "без пола строка не партия" },
  { theirs: "Цена", ours: "карточка SKU", note: "в прототипе не пишем в лот" },
  { theirs: "Кратность", ours: "packSize площадки", note: "паллета/связка из packing.ts" },
  { theirs: "Партия / Склад / Срок", ours: "batchNo, warehouse, readyDays", note: "то, чем торгует агент" },
];

export interface ExternalLotRow {
  code: string;
  name: string;
  sku: string;
  qty: number;
  unit: string;
  packSize: number;
  price: number | null;
  floor: number | null;
  warehouse: string;
  city: string;
  readyDays: number;
  batchNo: string;
  certs: string[];
}

export type AdaptSkip = { row: ExternalLotRow; reason: string };
export type AdaptOk = { row: ExternalLotRow; lot: Lot; productName: string; packNote: string };

function numRu(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parse1CCsv(text: string): ExternalLotRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(";").map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);
  return lines.slice(1).map((line) => {
    const c = line.split(";");
    const at = (name: string) => (idx(name) >= 0 ? (c[idx(name)] ?? "").trim() : "");
    const certs = at("Сертификаты")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      code: at("Код"),
      name: at("Наименование"),
      sku: at("Артикул"),
      qty: numRu(at("Остаток")) ?? 0,
      unit: at("Ед") || "шт",
      packSize: numRu(at("Кратность")) ?? 1,
      price: numRu(at("Цена")),
      floor: numRu(at("МинЦена")),
      warehouse: at("Склад"),
      city: at("Город"),
      readyDays: Math.max(0, Math.round(numRu(at("СрокДней")) ?? 0)),
      batchNo: at("Партия"),
      certs,
    };
  });
}

export function adapt1CRows(rows: ExternalLotRow[], sellerId: string): { ok: AdaptOk[]; skipped: AdaptSkip[] } {
  const ok: AdaptOk[] = [];
  const skipped: AdaptSkip[] = [];
  for (const row of rows) {
    if (row.unit === "усл" || /доставк|услуг/i.test(row.name)) {
      skipped.push({ row, reason: "не партия — услуга, на витрину не кладём" });
      continue;
    }
    if (row.floor == null || row.floor <= 0) {
      skipped.push({ row, reason: "нет пола цены — агент поставки не имеет права торговать" });
      continue;
    }
    if (row.qty <= 0) {
      skipped.push({ row, reason: "нулевой остаток" });
      continue;
    }
    const product = products.find((p) => p.sellerId === sellerId && p.sku === row.sku);
    if (!product) {
      skipped.push({ row, reason: "нет карточки SKU на площадке — сначала онбординг номенклатуры" });
      continue;
    }
    const pack = packingOf(product);
    const qty = Math.floor(row.qty / pack.packSize) * pack.packSize;
    if (qty < pack.packSize) {
      skipped.push({ row, reason: `остаток меньше кратности площадки (${pack.packSize} ${pack.packUnit})` });
      continue;
    }
    const packNote =
      row.packSize === pack.packSize
        ? `${pack.packSize} ${pack.packUnit}`
        : `их ${row.packSize} → наши ${pack.packSize} ${pack.packUnit}`;
    ok.push({
      row,
      productName: product.name,
      packNote,
      lot: {
        id: `lot-adapt-${product.sku}-${row.batchNo || row.code}`,
        productId: product.id,
        sellerId,
        batchNo: row.batchNo || row.code,
        qty,
        reserved: 0,
        unit: product.unit,
        packSize: pack.packSize,
        packUnit: pack.packUnit,
        warehouse: row.warehouse || "склад",
        city: row.city || product.specs.Отгрузка || "",
        readyDays: row.readyDays,
        certs: row.certs.length ? row.certs : ["под выпуск"],
        producedAt: "2026-09-08",
        incoterm: "FCA",
      },
    });
  }
  return { ok, skipped };
}
