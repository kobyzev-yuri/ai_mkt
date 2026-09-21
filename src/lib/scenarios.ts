export type AgentRoleId =
  | "orchestrator"
  | "parser"
  | "matcher"
  | "buyer-agent"
  | "seller-agent"
  | "mandate"
  | "fulfillment"
  | "ops"
  | "human"
  | "platform";

export interface AgentRole {
  id: AgentRoleId;
  name: string;
  lane: "platform" | "party" | "gate";
  job: string;
}

export const AGENT_ROLES: AgentRole[] = [
  {
    id: "orchestrator",
    name: "Оркестратор",
    lane: "platform",
    job: "Раскладывает сценарий на задачи и ждёт подтверждение человека или факт. Не торгуется.",
  },
  {
    id: "parser",
    name: "Парсер",
    lane: "platform",
    job: "Структурирует свободный текст. Не выдумывает объём и бюджет, если их нет.",
  },
  {
    id: "matcher",
    name: "Поиск партий",
    lane: "platform",
    job: "Подбор по категории, наличию, кратности, городу и доле поставок в срок.",
  },
  {
    id: "buyer-agent",
    name: "Агент закупки",
    lane: "party",
    job: "Сверяет техническую спецификацию карточки с заявкой. Если спека закрывает запрос — торг в мандате. Если не вполне — зовёт человека. Не платит и не утверждает.",
  },
  {
    id: "seller-agent",
    name: "Агент поставки",
    lane: "party",
    job: "Предложение от свободных партий. Уступает только до пола маржи.",
  },
  {
    id: "mandate",
    name: "Движок мандата",
    lane: "platform",
    job: "Цена, количество, статус. Языковая модель сюда не ходит.",
  },
  {
    id: "fulfillment",
    name: "Исполнение",
    lane: "platform",
    job: "Счёт, резерв по готовности, комплектация, накладная и УПД.",
  },
  {
    id: "ops",
    name: "Инциденты",
    lane: "platform",
    job: "Обход по факту срыва. Рейтинг не трогает.",
  },
  {
    id: "human",
    name: "Человек",
    lane: "gate",
    job: "Утвердить, оплатить, принять, эскалировать.",
  },
  {
    id: "platform",
    name: "Арбитр Atrium",
    lane: "gate",
    job: "Решение по документам в заказе. Только тогда бьёт рейтинг.",
  },
];

export interface ScenarioStep {
  id: string;
  title: string;
  roles: AgentRoleId[];
  human?: boolean;
}

export interface Scenario {
  id: "S1" | "S2" | "S3";
  name: string;
  blurb: string;
  steps: ScenarioStep[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: "S1",
    name: "Закупка партии",
    blurb: "От фразы закупщика до согласованных условий в мандате. Три поставщика отвечают параллельно.",
    steps: [
      { id: "parse", title: "Разбор потребности", roles: ["parser", "orchestrator"] },
      { id: "match", title: "Подбор свободных партий", roles: ["matcher"] },
      { id: "fit", title: "Сверка спецификации", roles: ["buyer-agent"] },
      { id: "talk", title: "Запрос и торг", roles: ["buyer-agent", "seller-agent", "mandate"] },
      { id: "gate", title: "Утверждение сделки", roles: ["human"], human: true },
    ],
  },
  {
    id: "S2",
    name: "Исполнение",
    blurb: "Склад не едет без аванса. Документы появляются в контуре, а не в почте.",
    steps: [
      { id: "advance", title: "Счёт и предоплата", roles: ["fulfillment", "human"], human: true },
      { id: "reserve", title: "Резерв лотов и комплектация", roles: ["fulfillment"] },
      { id: "ship", title: "Накладная и УПД, в пути", roles: ["fulfillment"] },
      { id: "accept", title: "Приёмка и остаток", roles: ["human", "fulfillment"], human: true },
    ],
  },
  {
    id: "S3",
    name: "Срыв",
    blurb: "Агент предлагает обход. Рейтинг меняется только если стороны не сошлись.",
    steps: [
      { id: "fact", title: "Фиксация факта", roles: ["ops", "human"] },
      { id: "remedy", title: "Обход в мандате площадки", roles: ["ops", "buyer-agent", "seller-agent"] },
      { id: "close", title: "Принятие или арбитраж", roles: ["human", "platform"], human: true },
    ],
  },
];

export const SPEECH_ACTS = [
  { act: "Заявка", from: "агент закупки", meaning: "запрос объёма, срока, города, бюджета" },
  { act: "Предложение", from: "агент поставки", meaning: "цена, предоплата, партии, самовывоз или доставка" },
  { act: "Встречное", from: "агент закупки", meaning: "ответ в пределах мандата" },
  { act: "Согласие / отказ", from: "движок мандата", meaning: "пересечение полов или срыв комнаты" },
  { act: "Утверждение", from: "человек", meaning: "сделка становится заказом" },
  { act: "Оплата / приёмка", from: "человек", meaning: "необратимые деньги и товар" },
  { act: "Претензия / обход", from: "агент инцидентов", meaning: "обход без удара по рейтингу" },
  { act: "Эскалация / решение", from: "человек / площадка", meaning: "арбитраж по документам" },
] as const;

export const DEMO_QUERY =
  "Нужно 50 000 коробок 300×200×150, крафт, доставка в Казань за 14 дней, бюджет до 2,1 млн";
