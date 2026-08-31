import type { Product } from "./types";

export function packingOf(product: Product): { packSize: number; packUnit: string } {
  if (product.packSize && product.packUnit) {
    return { packSize: product.packSize, packUnit: product.packUnit };
  }
  const { category, unit, moq } = product;
  if (category === "Упаковка" && unit === "шт") return { packSize: 500, packUnit: "паллета" };
  if (category === "Упаковка" && unit === "кг") return { packSize: 50, packUnit: "паллета" };
  if (category === "Металлопрокат") return { packSize: 2, packUnit: "связка" };
  if (category === "Химия" && product.sku.includes("SODA")) return { packSize: 25, packUnit: "мешок" };
  if (category === "Химия") return { packSize: 200, packUnit: "бочка" };
  if (category === "Спецодежда") return { packSize: 10, packUnit: "короб" };
  if (category === "Пиломатериалы" && unit === "м³") return { packSize: 4, packUnit: "пакет" };
  if (category === "Пиломатериалы") return { packSize: 20, packUnit: "пачка" };
  if (category === "Электроника") return { packSize: Math.max(2, Math.min(10, moq)), packUnit: "короб" };
  return { packSize: Math.max(1, moq), packUnit: "партия" };
}

export function snapToPack(qty: number, product: Product): number {
  const { packSize } = packingOf(product);
  const floor = Math.max(qty, product.moq);
  return Math.ceil(floor / packSize) * packSize;
}

export function packCount(qty: number, product: Product): number {
  const { packSize } = packingOf(product);
  return Math.round(qty / packSize);
}

export function packLabel(qty: number, product: Product): string {
  const { packSize, packUnit } = packingOf(product);
  const n = packCount(qty, product);
  return `${n}\u00a0${pluralPack(packUnit, n)} × ${packSize}\u00a0${product.unit}`;
}

function pluralPack(unit: string, n: number): string {
  if (unit === "паллета") return n === 1 ? "паллета" : n < 5 ? "паллеты" : "паллет";
  if (unit === "связка") return n === 1 ? "связка" : n < 5 ? "связки" : "связок";
  if (unit === "короб") return n === 1 ? "короб" : n < 5 ? "короба" : "коробов";
  if (unit === "бочка") return n === 1 ? "бочка" : n < 5 ? "бочки" : "бочек";
  if (unit === "мешок") return n === 1 ? "мешок" : n < 5 ? "мешка" : "мешков";
  if (unit === "пакет") return n === 1 ? "пакет" : n < 5 ? "пакета" : "пакетов";
  if (unit === "пачка") return n === 1 ? "пачка" : n < 5 ? "пачки" : "пачек";
  return unit;
}
