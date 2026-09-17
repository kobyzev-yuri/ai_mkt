import type { DocumentKind, Order } from "./types";

export interface PackItem {
  kind: DocumentKind;
  title: string;
  stage: "agree" | "ship" | "accept";
  note: string;
}

/** Именной комплект закрывающих. Не «документы где-то в почте», а чеклист заказа. */
export const DOCUMENT_PACK: PackItem[] = [
  { kind: "spec", title: "Спецификация партии", stage: "agree", note: "объём, кратность, партии" },
  { kind: "invoice", title: "Счёт на аванс", stage: "agree", note: "без оплаты склад не едет" },
  { kind: "cert", title: "Паспорт / сертификат партии", stage: "ship", note: "привязан к номеру партии" },
  { kind: "ttn", title: "Товарно-транспортная накладная", stage: "ship", note: "маршрут и перевозчик" },
  { kind: "upd", title: "УПД", stage: "ship", note: "закрывающий на отгрузку" },
  { kind: "acceptance", title: "Акт приёмки", stage: "accept", note: "без расхождений или с претензией" },
  { kind: "invoice", title: "Счёт на остаток", stage: "accept", note: "после подписанного акта" },
];

export interface PackRow extends PackItem {
  present: boolean;
  ref?: string;
}

export function packStatus(order: Order): PackRow[] {
  const docs = order.documents ?? [];
  const advance = order.invoices.find((i) => i.kind === "advance");
  const remainder = order.invoices.find((i) => i.kind === "remainder");
  return DOCUMENT_PACK.map((item) => {
    if (item.kind === "invoice" && item.stage === "agree") {
      const doc = docs.find((d) => d.kind === "invoice" && d.title === advance?.number);
      const fallback = docs.find((d) => d.kind === "invoice");
      const hit = doc ?? (remainder && fallback?.title === remainder.number ? undefined : fallback);
      return { ...item, present: Boolean(hit || advance), ref: hit?.ref ?? (advance ? `${advance.number}` : undefined) };
    }
    if (item.kind === "invoice" && item.stage === "accept") {
      const doc = docs.find((d) => d.kind === "invoice" && d.title === remainder?.number);
      const present = Boolean(doc) || (remainder?.status === "issued" || remainder?.status === "paid");
      return { ...item, present, ref: doc?.ref ?? (remainder ? `${remainder.number}` : undefined) };
    }
    const hit = docs.find((d) => d.kind === item.kind);
    return { ...item, present: Boolean(hit), ref: hit?.ref };
  });
}

export function packComplete(order: Order): boolean {
  return packStatus(order).every((row) => row.present);
}
