import { allProducts } from "./catalog";
import { packingOf } from "./packing";
import type { Lot, Product } from "./types";

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

export type SkipCode = "service" | "no_floor" | "zero_qty" | "no_sku" | "not_multiple";
export type SkipOwner = "supplier" | "platform";

export interface SkipIssue {
  code: SkipCode;
  fact: string;
  fix: string;
  owner: SkipOwner;
}

export type AdaptSkip = { row: ExternalLotRow; issues: SkipIssue[] };
export type AdaptOk = { row: ExternalLotRow; lot: Lot; productName: string; packNote: string };

export const SKIP_OWNER_LABEL: Record<SkipOwner, string> = {
  supplier: "поставщик сам",
  platform: "человек площадки",
};

function numRu(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function splitRow(line: string, sep: string): string[] {
  return line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
}

function headerIndex(header: string[], aliases: string[]): number {
  const norm = (s: string) => s.replace(/\s/g, "").toLowerCase();
  const cells = header.map(norm);
  for (const alias of aliases) {
    const i = cells.indexOf(norm(alias));
    if (i >= 0) return i;
  }
  return -1;
}

export function parse1CCsv(text: string): ExternalLotRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") || !lines[0].includes("\t") ? ";" : "\t";
  const header = splitRow(lines[0], sep);
  const at = (cells: string[], aliases: string[]) => {
    const i = headerIndex(header, aliases);
    return i >= 0 ? (cells[i] ?? "").trim() : "";
  };
  return lines.slice(1).map((line) => {
    const c = splitRow(line, sep);
    const certs = at(c, ["Сертификаты", "Сертификат"])
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      code: at(c, ["Код", "КодНоменклатуры"]),
      name: at(c, ["Наименование", "Номенклатура", "НаименованиеНоменклатуры"]),
      sku: at(c, ["Артикул", "АртикулНоменклатуры", "SKU"]),
      qty: numRu(at(c, ["Остаток", "Количество", "КоличествоОстаток"])) ?? 0,
      unit: at(c, ["Ед", "Единица", "ЕдиницаИзмерения"]) || "шт",
      packSize: numRu(at(c, ["Кратность", "КратностьОтгрузки"])) ?? 1,
      price: numRu(at(c, ["Цена", "ЦенаПродажи"])),
      floor: numRu(at(c, ["МинЦена", "МинимальнаяЦена", "ЦенаПол"])),
      warehouse: at(c, ["Склад", "СкладОстатков"]),
      city: at(c, ["Город", "ГородСклада"]),
      readyDays: Math.max(0, Math.round(numRu(at(c, ["СрокДней", "Срок"])) ?? 0)),
      batchNo: at(c, ["Партия", "Серия", "НомерПартии"]),
      certs,
    };
  });
}

function catalogOf(catalog?: Product[]): Product[] {
  const map = new Map(allProducts().map((p) => [p.id, p]));
  for (const p of catalog ?? []) map.set(p.id, p);
  return [...map.values()];
}

function normSku(raw: string): string {
  return raw.trim().toLowerCase().replace(/^atr-/, "");
}

function findListing(catalog: Product[], sellerId: string, article: string): Product | undefined {
  const sku = normSku(article);
  if (!sku) return undefined;
  const mine = catalog.filter((p) => p.sellerId === sellerId);
  return mine.find((p) => normSku(p.sku) === sku) ?? catalog.find((p) => normSku(p.sku) === sku && p.sellerId === sellerId);
}

function collectIssues(
  row: ExternalLotRow,
  sellerId: string,
  catalog: Product[],
): { issues: SkipIssue[]; productName?: string; pack?: { packSize: number; packUnit: string } } {
  const issues: SkipIssue[] = [];
  if (row.unit === "усл" || /доставк|услуг/i.test(row.name)) {
    issues.push({
      code: "service",
      fact: "не партия — услуга",
      fix: "убрать услугу из выгрузки остатков",
      owner: "supplier",
    });
  }
  if (row.floor == null || row.floor <= 0) {
    issues.push({
      code: "no_floor",
      fact: "нет пола цены",
      fix: "проставить МинЦену в карточке 1С",
      owner: "supplier",
    });
  }
  if (row.qty <= 0) {
    issues.push({
      code: "zero_qty",
      fact: "нулевой остаток",
      fix: "догрузить остаток или не выгружать строку",
      owner: "supplier",
    });
  }
  const product = findListing(catalog, sellerId, row.sku);
  if (!product) {
    issues.push({
      code: "no_sku",
      fact: "нет карточки SKU на площадке",
      fix: "онбординг номенклатуры, затем повторная выгрузка",
      owner: "platform",
    });
    return { issues };
  }
  const pack = packingOf(product);
  const qty = Math.floor(row.qty / pack.packSize) * pack.packSize;
  if (qty < pack.packSize) {
    issues.push({
      code: "not_multiple",
      fact: `остаток меньше кратности площадки (${pack.packSize} ${pack.packUnit})`,
      fix: `округлить к ${pack.packSize} ${pack.packUnit} или догрузить остаток`,
      owner: "supplier",
    });
  }
  return { issues, productName: product.name, pack };
}

export function adapt1CRows(
  rows: ExternalLotRow[],
  sellerId: string,
  catalog?: Product[],
): { ok: AdaptOk[]; skipped: AdaptSkip[] } {
  const products = catalogOf(catalog);
  const ok: AdaptOk[] = [];
  const skipped: AdaptSkip[] = [];
  for (const row of rows) {
    const { issues, productName, pack } = collectIssues(row, sellerId, products);
    if (issues.length) {
      skipped.push({ row, issues });
      continue;
    }
    const product = findListing(products, sellerId, row.sku);
    if (!product || !pack) continue;
    const qty = Math.floor(row.qty / pack.packSize) * pack.packSize;
    const packNote =
      row.packSize === pack.packSize
        ? `${pack.packSize} ${pack.packUnit}`
        : `их ${row.packSize} → наши ${pack.packSize} ${pack.packUnit}`;
    ok.push({
      row,
      productName: productName ?? product.name,
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

