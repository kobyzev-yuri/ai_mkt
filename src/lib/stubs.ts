export type StubId = "messenger" | "onec" | "edo" | "egrul";

export interface StubCopy {
  id: StubId;
  channel: string;
  title: string;
  idea: string;
  skip: string;
}

export const STUBS: Record<StubId, StubCopy> = {
  messenger: {
    id: "messenger",
    channel: "Telegram / WhatsApp",
    title: "Лид не проспать",
    idea: "Агент пишет в мессенджер, когда пришла заявка в мандате. Сообщение зовёт в комнату Atrium — сделка не уезжает в чат.",
    skip: "бота, webhook, шаблоны, opt-in",
  },
  onec: {
    id: "onec",
    channel: "1С",
    title: "Прайс без ручного дубля",
    idea: "Выгрузка остатков на витрину за часы, не за неделю. Строка без пола или не в кратности на площадку не попадает.",
    skip: "OData, COM, двустороннюю синхронизацию",
  },
  edo: {
    id: "edo",
    channel: "ЭДО · эквайринг · доставка",
    title: "Документы в контуре, фуры — у операторов",
    idea: "Счёт и УПД рождаются вместе со статусом заказа. Деньги и перевозка — у банка и ПЭК, не у среды агентов.",
    skip: "Диадок, эквайринг, расчёт ПЭК/СДЭК",
  },
  egrul: {
    id: "egrul",
    channel: "ЕГРЮЛ",
    title: "Контрагент с ИНН, не аноним",
    idea: "Карточка организации — имя, ИНН, город, доверие. Проверку реестра не подключаем: идея яснее живого Контура.",
    skip: "Контур.Фокус, DaData, подпись ЭЦП",
  },
};

export const MESSENGER_PREVIEW =
  "СеверПак, заявка: 18 000 коробок 300×200×150, Самара, бюджет 720 тыс. Агент «Крафт» ответил в мандате. Открыть комнату.";
