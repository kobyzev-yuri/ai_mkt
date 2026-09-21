export type Desk = "buy" | "sell" | "office";

export interface Account {
  id: string;
  pin: string;
  desk: Desk;
  companyId: string | null;
  org: string;
  person: string;
  blurb: string;
}

/** Roster for marketplace login. Password is on the card — jury gate, not SSO. */
export const ACCOUNTS: Account[] = [
  {
    id: "acc-owner",
    pin: "0000",
    desk: "office",
    companyId: null,
    org: "Atrium",
    person: "Оператор площадки",
    blurb: "Посредник: номинал, арбитраж, номенклатура, реестр участников. Не сторона сделки.",
  },
  {
    id: "acc-kofe",
    pin: "1111",
    desk: "buy",
    companyId: "co-kofe",
    org: "Кофейня Холдинг",
    person: "Закуп · Казань",
    blurb: "Мандат агента, новая заявка, контроль сделок, закрытые, аналитика.",
  },
  {
    id: "acc-teh",
    pin: "1112",
    desk: "buy",
    companyId: "co-teh",
    org: "ТехСтрой",
    person: "Смета · Москва",
    blurb: "Мандат агента, новая заявка, контроль сделок, закрытые, аналитика.",
  },
  {
    id: "acc-retail",
    pin: "1113",
    desk: "buy",
    companyId: "co-retail",
    org: "Волга Ритейл",
    person: "Полка · Самара",
    blurb: "Мандат агента, новая заявка, контроль сделок, закрытые, аналитика.",
  },
  {
    id: "acc-agro",
    pin: "1114",
    desk: "buy",
    companyId: "co-agro",
    org: "АгроТех",
    person: "Поле · Саратов",
    blurb: "Мандат агента, новая заявка, контроль сделок, закрытые, аналитика.",
  },
  {
    id: "acc-sever",
    pin: "2222",
    desk: "sell",
    companyId: "co-severpak",
    org: "СеверПак",
    person: "Крафт · Казань",
    blurb: "Мандат агента, выгрузка витрины, контроль сделок, закрытые, аналитика.",
  },
  {
    id: "acc-ural",
    pin: "2223",
    desk: "sell",
    companyId: "co-ural",
    org: "УралСталь",
    person: "Прокат · Челябинск",
    blurb: "Мандат агента, выгрузка витрины, контроль сделок, закрытые, аналитика.",
  },
  {
    id: "acc-volga",
    pin: "2224",
    desk: "sell",
    companyId: "co-volga",
    org: "ВолгаКомплект",
    person: "Контур · Самара",
    blurb: "Мандат агента, выгрузка витрины, контроль сделок, закрытые, аналитика.",
  },
  {
    id: "acc-him",
    pin: "2225",
    desk: "sell",
    companyId: "co-him",
    org: "ХимСнаб",
    person: "Реагент · Н. Новгород",
    blurb: "Мандат агента, выгрузка витрины, контроль сделок, закрытые, аналитика.",
  },
  {
    id: "acc-spec",
    pin: "2226",
    desk: "sell",
    companyId: "co-spec",
    org: "СпецФорма",
    person: "Ткань · Иваново",
    blurb: "Мандат агента, выгрузка витрины, контроль сделок, закрытые, аналитика.",
  },
  {
    id: "acc-les",
    pin: "2227",
    desk: "sell",
    companyId: "co-les",
    org: "ЛесОпт",
    person: "Бор · Киров",
    blurb: "Мандат агента, выгрузка витрины, контроль сделок, закрытые, аналитика.",
  },
];

let extraAccounts: Account[] = [];

export function allAccounts(): Account[] {
  const map = new Map(ACCOUNTS.map((a) => [a.id, a]));
  for (const a of extraAccounts) map.set(a.id, a);
  return [...map.values()];
}

export function mergeAccounts(rows: Account[]) {
  extraAccounts = rows.filter((a) => !ACCOUNTS.some((s) => s.id === a.id));
}

export function accountById(id: string): Account | undefined {
  return allAccounts().find((a) => a.id === id);
}

export function deskHome(desk: Desk): string {
  if (desk === "buy") return "/buy";
  if (desk === "sell") return "/sell";
  return "/office";
}

export function deskLabel(desk: Desk): string {
  if (desk === "buy") return "Закупки";
  if (desk === "sell") return "Поставки";
  return "Бэкофис";
}

export function isDemoPath(pathname: string): boolean {
  return pathname === "/demo" || pathname.startsWith("/demo/");
}

export function isPublicPath(pathname: string): boolean {
  return pathname.startsWith("/login") || isDemoPath(pathname);
}

export function pathAllowed(desk: Desk, pathname: string): boolean {
  if (pathname.startsWith("/login") || isDemoPath(pathname)) return true;
  if (desk === "office") {
    return !(
      pathname.startsWith("/buy") ||
      pathname.startsWith("/sell") ||
      pathname.startsWith("/rfq") ||
      pathname.startsWith("/dashboard")
    );
  }
  if (
    pathname.startsWith("/office") ||
    pathname.startsWith("/concept") ||
    pathname.startsWith("/trust") ||
    pathname.startsWith("/process")
  ) {
    return false;
  }
  if (pathname.startsWith("/sell")) return desk === "sell";
  if (pathname.startsWith("/buy") || pathname.startsWith("/rfq")) return desk === "buy";
  return true;
}

export function navWorkspaces(desk: Desk): Array<"plaza" | "buy" | "sell" | "office"> {
  if (desk === "buy") return ["buy"];
  if (desk === "sell") return ["sell"];
  return ["office"];
}
