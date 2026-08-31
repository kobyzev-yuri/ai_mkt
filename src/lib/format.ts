export function rub(n: number): string {
  const digits = Number.isInteger(Math.round(n * 100) / 100) && Number.isInteger(n) ? 0 : 2;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function num(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

export function qty(n: number, unit: string): string {
  return `${num(n)}\u00a0${unit}`;
}

export function compactRub(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const s = m >= 10 ? m.toFixed(0) : m.toFixed(1).replace(".", ",");
    return `${s}\u00a0млн\u00a0₽`;
  }
  if (n >= 10_000) {
    return `${num(Math.round(n / 1000))}\u00a0тыс\u00a0₽`;
  }
  return rub(n);
}

export function days(n: number): string {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  let word = "дней";
  if (mod10 === 1 && mod100 !== 11) word = "день";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "дня";
  return `${n} ${word}`;
}

export function rating(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

export function when(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function dealStatusLabel(status: string): string {
  switch (status) {
    case "open":
      return "RFQ отправлен";
    case "countering":
      return "Переговоры";
    case "agreed":
      return "Условия сошлись";
    case "approved":
      return "Сделка утверждена";
    case "rejected":
      return "Не сошлись";
    default:
      return status;
  }
}

export function orderStatusLabel(status: string): string {
  switch (status) {
    case "advance_due":
      return "Ждёт предоплату";
    case "reserving":
      return "Резерв партий";
    case "picking":
      return "Комплектация";
    case "shipping":
      return "Отгрузка";
    case "in_transit":
      return "В пути";
    case "delivered":
      return "Доставлен";
    case "acceptance_due":
      return "Ждёт приёмку";
    case "remainder_due":
      return "Ждёт остаток";
    case "settled":
      return "Закрыт";
    default:
      return status;
  }
}

export function rfqStatusLabel(status: string): string {
  switch (status) {
    case "matching":
      return "Подбор";
    case "negotiating":
      return "Переговоры";
    case "awarded":
      return "Выбран победитель";
    case "closed":
      return "Закрыт";
    default:
      return status;
  }
}
