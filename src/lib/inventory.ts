import { packingOf } from "./packing";
import type { Allocation, Lot, Product } from "./types";

const WAREHOUSES: Record<string, { city: string; names: string[] }> = {
  "co-severpak": { city: "Казань", names: ["Казань, склад №1", "Наб. Челны, площадка"] },
  "co-ural": { city: "Челябинск", names: ["Челябинск, база", "Магнитогорск, тупик"] },
  "co-volga": { city: "Самара", names: ["Самара, склад АСУ"] },
  "co-him": { city: "Нижний Новгород", names: ["Н. Новгород, налив", "Дзержинск"] },
  "co-spec": { city: "Иваново", names: ["Иваново, цех", "Кинешма"] },
  "co-les": { city: "Киров", names: ["Киров, тупик"] },
};

export function freeQty(lot: Lot): number {
  return Math.max(0, lot.qty - lot.reserved);
}

export function buildLots(products: Product[]): Lot[] {
  return products.flatMap((product) => {
    const pack = packingOf(product);
    const wh = WAREHOUSES[product.sellerId] ?? { city: "Россия", names: ["склад"] };
    const snap = (n: number) => Math.max(pack.packSize, Math.floor(n / pack.packSize) * pack.packSize);
    const a = snap(product.stock * 0.55);
    const b = snap(product.stock * 0.28);
    const prod = snap(Math.max(product.moq * 40, product.stock * 0.5));
    const sku = product.sku.replace(/[^A-Z0-9]/gi, "");
    return [
      {
        id: `lot-${product.id}-a`,
        productId: product.id,
        sellerId: product.sellerId,
        batchNo: `${sku}-0826-A`,
        qty: a,
        reserved: 0,
        unit: product.unit,
        packSize: pack.packSize,
        packUnit: pack.packUnit,
        warehouse: wh.names[0],
        city: wh.city,
        readyDays: 0,
        certs: certsFor(product),
        producedAt: "2026-08-12",
        incoterm: "FCA",
      },
      {
        id: `lot-${product.id}-b`,
        productId: product.id,
        sellerId: product.sellerId,
        batchNo: `${sku}-0828-B`,
        qty: b,
        reserved: 0,
        unit: product.unit,
        packSize: pack.packSize,
        packUnit: pack.packUnit,
        warehouse: wh.names[1] ?? wh.names[0],
        city: wh.names[1] ? wh.names[1].split(",")[0] : wh.city,
        readyDays: 3,
        certs: certsFor(product),
        producedAt: "2026-08-20",
        incoterm: "FCA",
      },
      {
        id: `lot-${product.id}-prod`,
        productId: product.id,
        sellerId: product.sellerId,
        batchNo: `${sku}-SLOT-09`,
        qty: prod,
        reserved: 0,
        unit: product.unit,
        packSize: pack.packSize,
        packUnit: pack.packUnit,
        warehouse: "слот производства",
        city: wh.city,
        readyDays: product.leadDays,
        certs: ["под выпуск"],
        producedAt: "2026-09-08",
        incoterm: "FCA",
      },
    ];
  });
}

function certsFor(product: Product): string[] {
  if (product.category === "Металлопрокат") return ["ГОСТ 34028-2016", "паспорт плавки"];
  if (product.category === "Химия") return ["паспорт качества", "SDS"];
  if (product.category === "Упаковка") return ["декларация ТР ТС", "пищевой допуск"];
  if (product.category === "Спецодежда") return ["ГОСТ 12.4.280"];
  if (product.category === "Электроника") return ["паспорт", "поверка"];
  return ["сертификат"];
}

export function lotsForProduct(lots: Lot[], productId: string): Lot[] {
  return lots.filter((l) => l.productId === productId);
}

export function allocateLots(
  lots: Lot[],
  productId: string,
  qty: number,
): { ok: boolean; lots: Lot[]; allocations: Allocation[]; leadDays: number; shortfall: number } {
  const next = lots.map((l) => ({ ...l }));
  const mine = next
    .filter((l) => l.productId === productId && freeQty(l) > 0)
    .sort((a, b) => a.readyDays - b.readyDays || freeQty(b) - freeQty(a));
  let left = qty;
  const allocations: Allocation[] = [];
  for (const lot of mine) {
    if (left <= 0) break;
    const take = Math.min(freeQty(lot), left);
    const snapped = Math.floor(take / lot.packSize) * lot.packSize;
    if (snapped <= 0) continue;
    lot.reserved += snapped;
    allocations.push({
      lotId: lot.id,
      batchNo: lot.batchNo,
      warehouse: lot.warehouse,
      qty: snapped,
      readyDays: lot.readyDays,
    });
    left -= snapped;
  }
  const leadDays = allocations.length ? Math.max(...allocations.map((a) => a.readyDays)) : 0;
  return { ok: left <= 0, lots: next, allocations, leadDays, shortfall: left };
}

export function releaseLots(lots: Lot[], allocations: Allocation[]): Lot[] {
  return lots.map((lot) => {
    const take = allocations.filter((a) => a.lotId === lot.id).reduce((s, a) => s + a.qty, 0);
    if (!take) return lot;
    return { ...lot, reserved: Math.max(0, lot.reserved - take) };
  });
}

export function consumeLots(lots: Lot[], allocations: Allocation[]): Lot[] {
  return lots.map((lot) => {
    const take = allocations.filter((a) => a.lotId === lot.id).reduce((s, a) => s + a.qty, 0);
    if (!take) return lot;
    return {
      ...lot,
      qty: Math.max(0, lot.qty - take),
      reserved: Math.max(0, lot.reserved - take),
    };
  });
}
