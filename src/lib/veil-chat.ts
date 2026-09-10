/** Shared deal room is a counterparty channel. Floor, margin and the other side's cap stay private. */

export function veilChat(text: string, viewer: "buyer" | "seller"): string {
  let t = text;
  if (viewer === "buyer") {
    t = t
      .replace(/Пол мандата\s*[—–-]\s*[\d\s\u00a0]+(?:[.,]\d+)?\s*₽\.?\s*/gi, "")
      .replace(/Пол мандата:\s*[\d\s\u00a0]+(?:[.,]\d+)?\s*₽\.?\s*/gi, "")
      .replace(/ниже пола\s*[\d\s\u00a0]+(?:[.,]\d+)?\s*₽\s*/gi, "ниже нашего крайнего ")
      .replace(/\(мандат:\s*маржа[^)]*\)/gi, "")
      .replace(/Ниже\s*[\d\s\u00a0]+(?:[.,]\d+)?\s*₽\s*[—–-]\s*ломаем маржу\s*\d+%\./gi, "Ниже не идём.")
      .replace(/Пол\s+\d+%\s+маржи[^.]*\./gi, "Это крайнее предложение.")
      .replace(/режем маржу мандата/gi, "ниже не идём")
      .replace(/маржа\s*≥\s*\d+%/gi, "")
      .replace(/ломаем маржу\s*\d+%/gi, "дальше не идём")
      .replace(/на пределе мандатов:\s*/gi, "")
      .replace(/Есть пространство для торга\./gi, "");
  } else {
    t = t
      .replace(/Мандат покупателя:\s*.+$/gim, "Запрос направлен.")
      .replace(/Мандат:\s*.+$/gim, "Запрос направлен.")
      .replace(/бюджет заявки\s*[\d\s\u00a0]+(?:[.,]\d+)?\s*₽\.?\s*/gi, "")
      .replace(/\(потолок\s*[\d\s\u00a0]+(?:[.,]\d+)?\s*₽(?:\/[^)]+)?\)/gi, "")
      .replace(/потолок\s*[\d\s\u00a0]+(?:[.,]\d+)?\s*₽(?:\/[^\s,.]*)?/gi, "мандат закупки")
      .replace(/выше потолка\s*[\d\s\u00a0]+(?:[.,]\d+)?\s*₽/gi, "выше мандата закупки")
      .replace(/сверяет[^.]*потолком[^.]*\./gi, "сверяет встречное со своим мандатом.")
      .replace(/потолком покупателя/gi, "мандатом закупки");
  }
  return t.replace(/[ \t]{2,}/g, " ").replace(/\s+\./g, ".").replace(/\(\s*\)/g, "").trim();
}
