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
    id: "acc-kofe",
    pin: "1111",
    desk: "buy",
    companyId: "co-kofe",
    org: "Кофейня Холдинг",
    person: "Закуп · Казань",
    blurb: "Кабинет закупщика. Заявки, комнаты, аванс и приёмка.",
  },
  {
    id: "acc-teh",
    pin: "1112",
    desk: "buy",
    companyId: "co-teh",
    org: "ТехСтрой",
    person: "Смета · Москва",
    blurb: "Кабинет закупщика. Прокат под график объекта.",
  },
  {
    id: "acc-sever",
    pin: "2222",
    desk: "sell",
    companyId: "co-severpak",
    org: "СеверПак",
    person: "Крафт · Казань",
    blurb: "Кабинет поставщика. Входящие сделки, витрина, адаптер 1С.",
  },
  {
    id: "acc-ural",
    pin: "2223",
    desk: "sell",
    companyId: "co-ural",
    org: "УралСталь",
    person: "Прокат · Челябинск",
    blurb: "Кабинет поставщика. Жёсткий пол и отгрузка с базы.",
  },
  {
    id: "acc-owner",
    pin: "0000",
    desk: "office",
    companyId: null,
    org: "Atrium",
    person: "Оператор площадки",
    blurb: "Бэкофис площадки. Схема агентов, рельсы расчётов, аналитика. Не сторона сделки.",
  },
];

export function accountById(id: string): Account | undefined {
  return ACCOUNTS.find((a) => a.id === id);
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
      pathname.startsWith("/deals") ||
      pathname.startsWith("/orders") ||
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
  if (desk === "buy") return ["plaza", "buy"];
  if (desk === "sell") return ["plaza", "sell"];
  return ["plaza", "office"];
}
