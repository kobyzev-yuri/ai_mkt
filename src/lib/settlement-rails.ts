/** Same payment protocol, different money rails. Integrator wires the fact, not a new engine. */

export type SettlementRailId = "direct" | "escrow" | "factor";

export interface SettlementStep {
  id: string;
  title: string;
  atrium: string;
  money: string;
}

export interface SettlementRail {
  id: SettlementRailId;
  label: string;
  hint: string;
  whoHolds: string;
  whoConfirms: string;
  sellerGetsPaid: string;
  scale: string;
  steps: SettlementStep[];
}

export const SETTLEMENT_CASE = {
  title: "50 000 коробок, СеверПак",
  total: 2_037_000,
  prepayPct: 40,
  advance: 814_800,
  remainder: 1_222_200,
};

export const SETTLEMENT_PROTOCOL = [
  "Счёт аванса issued",
  "Факт оплаты аванса",
  "Склад / резерв / УПД",
  "Приёмка",
  "Счёт остатка issued",
  "Факт оплаты остатка",
  "settled",
] as const;

export const SETTLEMENT_RAILS: SettlementRail[] = [
  {
    id: "direct",
    label: "Прямой расчёт",
    hint: "База B2B. Деньги не заходят на площадку.",
    whoHolds: "Расчётный счёт СеверПака",
    whoConfirms: "Выписка банка или 1С казначейства покупателя",
    sellerGetsPaid: "В тот же день, как пришла платёжка",
    scale: "Постоянные пары, свой банк-клиент, любой объём",
    steps: [
      { id: "inv", title: "Счёт аванса 40%", atrium: "invoice.advance = issued", money: "Счёт уходит в банк-клиент / 1С" },
      { id: "pay", title: "Факт аванса", atrium: "payAdvance", money: "Платёжка на р/с СеверПака" },
      { id: "ship", title: "Отгрузка", atrium: "резерв, ТТН, УПД", money: "Деньги уже у продавца" },
      { id: "acc", title: "Приёмка + остаток", atrium: "payRemainder", money: "Вторая платёжка, отсрочка 14 дн." },
    ],
  },
  {
    id: "escrow",
    label: "Номинальный счёт",
    hint: "Гарантия для незнакомцев. Как Trade Assurance, не эквайринг.",
    whoHolds: "Номинальный счёт Atrium до акта",
    whoConfirms: "Банк номинального счёта → событие в шину",
    sellerGetsPaid: "После приёмки (или по правилам спора)",
    scale: "Новые пары, спорный рейтинг, первый контракт",
    steps: [
      { id: "inv", title: "Счёт аванса 40%", atrium: "invoice.advance = issued", money: "Реквизиты номинального счёта" },
      { id: "pay", title: "Факт аванса", atrium: "payAdvance", money: "Деньги на номинале, не у СеверПака" },
      { id: "ship", title: "Отгрузка", atrium: "резерв, ТТН, УПД", money: "Продавец ещё не получил аванс" },
      { id: "acc", title: "Приёмка + остаток", atrium: "payRemainder", money: "Номинал отпускает аванс и остаток продавцу" },
    ],
  },
  {
    id: "factor",
    label: "Отсрочка + фактор",
    hint: "Продавец не ждёт 14 дней. Покупатель платит как обычно.",
    whoHolds: "Фактор после отгрузки, затем покупатель фактору",
    whoConfirms: "Уступка + событие отгрузки / реестр фактора",
    sellerGetsPaid: "На отгрузке (минус дисконт фактора)",
    scale: "Повторные отгрузки, казначейство не тянет кассовый разрыв",
    steps: [
      { id: "inv", title: "Счёт аванса 40%", atrium: "invoice.advance = issued", money: "Аванс можно прямым рельсом" },
      { id: "pay", title: "Факт аванса", atrium: "payAdvance", money: "Как в прямом расчёте или на номинал" },
      { id: "ship", title: "Отгрузка", atrium: "резерв, ТТН, УПД", money: "Фактор выкупает остаток у СеверПака" },
      { id: "acc", title: "Приёмка + остаток", atrium: "payRemainder", money: "Покупатель платит фактору, не продавцу" },
    ],
  },
];
