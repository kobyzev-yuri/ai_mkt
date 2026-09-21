import type { Need, Product, SpecCheck, SpecFit } from "./types";

function fold(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е");
}

function specBlob(product: Product): string {
  return fold(
    [
      product.name,
      product.category,
      product.unit,
      product.description,
      ...product.tags,
      ...Object.entries(product.specs).map(([key, value]) => `${key} ${value}`),
    ].join(" "),
  );
}

function parseHeightRange(text: string): [number, number] | null {
  const folded = fold(text);
  const labeled = folded.match(/рост[^\d]{0,12}(\d{3})\s*[–\-]\s*(\d{3})/);
  if (labeled) {
    const a = Number(labeled[1]);
    const b = Number(labeled[2]);
    if (a >= 140 && b <= 220 && a < b) return [a, b];
  }
  const plain = folded.match(/(\d{3})\s*[–\-]\s*(\d{3})/);
  if (plain) {
    const a = Number(plain[1]);
    const b = Number(plain[2]);
    if (a >= 140 && b <= 220 && a < b) return [a, b];
  }
  return null;
}

interface Requirement {
  id: string;
  label: string;
  asked: string;
  essential: boolean;
  hit: boolean;
  clash: boolean;
}

function collectRequirements(need: Need, product: Product, blob: string): Requirement[] {
  const q = fold(`${need.query} ${need.keywords.join(" ")}`);
  const reqs: Requirement[] = [];

  const add = (row: Omit<Requirement, "hit" | "clash"> & { hit: boolean; clash?: boolean }) => {
    reqs.push({ ...row, clash: Boolean(row.clash) });
  };

  if (need.category) {
    add({
      id: "category",
      label: "Категория",
      asked: need.category,
      essential: true,
      hit: product.category === need.category,
      clash: product.category !== need.category,
    });
  }

  if (need.unit) {
    add({
      id: "unit",
      label: "Единица",
      asked: need.unit,
      essential: true,
      hit: product.unit === need.unit,
      clash: product.unit !== need.unit,
    });
  }

  const wantsKit = /комплект|костюм/.test(q) || need.unit === "компл.";
  const wantsFootwear = /ботинк|обув|сапог/.test(q) && !wantsKit;
  if (wantsKit) {
    const isFootwear = product.unit === "пар" || (/ботинк|обув|сапог/.test(blob) && !/комплект|костюм|куртк/.test(blob));
    add({
      id: "kind",
      label: "Вид",
      asked: "комплект одежды",
      essential: true,
      hit: /комплект|костюм|куртк/.test(blob) && !isFootwear,
      clash: isFootwear,
    });
  } else if (wantsFootwear) {
    add({
      id: "kind",
      label: "Вид",
      asked: "обувь",
      essential: true,
      hit: /ботинк|обув|сапог/.test(blob),
      clash: /комплект|костюм/.test(blob) && !/ботинк|обув/.test(blob),
    });
  }

  if (/зим/.test(q)) {
    add({
      id: "season",
      label: "Сезон",
      asked: "зима",
      essential: true,
      hit: /зим|утепл/.test(blob),
      clash: /летн|\bлето\b/.test(blob) && !/зим/.test(blob),
    });
  } else if (/летн|\bлето\b/.test(q)) {
    add({
      id: "season",
      label: "Сезон",
      asked: "лето",
      essential: true,
      hit: /летн|\bлето\b/.test(blob),
      clash: /зим|утепл/.test(blob) && !/летн|\bлето\b/.test(blob),
    });
  }

  const heightMatch = q.match(/рост\s*(\d{2,3})/);
  if (heightMatch) {
    const height = Number(heightMatch[1]);
    const range = parseHeightRange(
      `${product.specs.Рост ?? ""} ${product.specs["Размерный ряд"] ?? ""} ${blob}`,
    );
    add({
      id: "height",
      label: "Рост",
      asked: String(height),
      essential: true,
      hit: range != null && height >= range[0] && height <= range[1],
      clash: range != null && (height < range[0] || height > range[1]),
    });
  }

  if (/склад|элеватор/.test(q)) {
    add({
      id: "duty",
      label: "Назначение",
      asked: /элеватор/.test(q) ? "элеватор / склад" : "склад",
      essential: false,
      hit: /склад|элеватор|производств/.test(blob),
    });
  }

  const dim = need.query.match(/(\d{2,4})\s*[×xх]\s*(\d{2,4})\s*[×xх]\s*(\d{2,4})/i);
  if (dim) {
    const asked = `${dim[1]}×${dim[2]}×${dim[3]}`;
    const compact = `${dim[1]}${dim[2]}${dim[3]}`;
    const blobCompact = blob.replace(/[^\d]/g, "");
    add({
      id: "size",
      label: "Размер",
      asked,
      essential: true,
      hit: blob.includes(`${dim[1]}×${dim[2]}×${dim[3]}`) || blob.includes(`${dim[1]}x${dim[2]}x${dim[3]}`) || blobCompact.includes(compact),
      clash:
        /\d{2,4}\s*[×xх]\s*\d{2,4}\s*[×xх]\s*\d{2,4}/.test(blob) &&
        !blob.includes(`${dim[1]}×${dim[2]}×${dim[3]}`) &&
        !blobCompact.includes(compact),
    });
  }

  if (/крафт/.test(q)) {
    add({
      id: "kraft",
      label: "Материал",
      asked: "крафт",
      essential: true,
      hit: /крафт/.test(blob),
      clash: /топлайнер|белый/.test(blob) && !/крафт/.test(blob),
    });
  }

  const dia = q.match(/[øØ⌀]\s*(\d{1,2})/) ?? q.match(/диаметр[^\d]{0,8}(\d{1,2})/);
  if (dia) {
    const mm = dia[1];
    add({
      id: "diameter",
      label: "Диаметр",
      asked: `Ø${mm}`,
      essential: true,
      hit: blob.includes(`${mm} мм`) || blob.includes(`ø${mm}`) || blob.includes(`диаметр ${mm}`),
      clash: /диаметр|ø|мм/.test(blob) && !blob.includes(`${mm} мм`) && !blob.includes(`ø${mm}`),
    });
  }

  if (/а500/.test(q)) {
    add({
      id: "steel",
      label: "Класс",
      asked: "А500С",
      essential: true,
      hit: /а500/.test(blob),
      clash: /ст3|а400|а240/.test(blob) && !/а500/.test(blob),
    });
  }

  if (/арматур/.test(q)) {
    add({
      id: "rebar",
      label: "Вид",
      asked: "арматура",
      essential: true,
      hit: /арматур/.test(blob),
      clash: /лист|труба|уголок/.test(blob) && !/арматур/.test(blob),
    });
  }

  return reqs;
}

function line(req: Requirement, kind: "hit" | "gap" | "clash"): string {
  if (kind === "hit") return `${req.label}: «${req.asked}» — есть в спецификации`;
  if (kind === "clash") return `${req.label}: в заявке «${req.asked}», в спецификации другое`;
  return `${req.label}: в заявке «${req.asked}», в спецификации нет`;
}

export function specFit(need: Need, product: Product): SpecCheck {
  const blob = specBlob(product);
  const reqs = collectRequirements(need, product, blob);
  const hits = reqs.filter((r) => r.hit && !r.clash).map((r) => line(r, "hit"));
  const clashes = reqs.filter((r) => r.clash).map((r) => line(r, "clash"));
  const gaps = reqs.filter((r) => !r.hit && !r.clash).map((r) => line(r, "gap"));
  const essentialGaps = reqs.filter((r) => r.essential && !r.hit && !r.clash);
  const essentialClashes = reqs.filter((r) => r.essential && r.clash);

  let fit: SpecFit = "match";
  if (essentialClashes.length > 0) fit = "mismatch";
  else if (essentialGaps.length > 0 || reqs.length === 0) fit = "partial";

  return { fit, hits, gaps, clashes };
}

export function specFitLabel(fit: SpecFit): string {
  if (fit === "match") return "Спецификация закрывает заявку";
  if (fit === "partial") return "Спецификация неполная";
  return "Спецификация противоречит заявке";
}
