import { uid } from "./ids";
import { rub } from "./format";
import type { Incident, IncidentKind, Invoice, Order, Remedy, Shipment, TradeDocument } from "./types";

export type UnwindMode = "none" | "unpaid" | "paid";

export interface KindPlaybook {
  kind: IncidentKind;
  when: string;
  /** What it looks like on the warehouse / in the bank. */
  life: string;
  workaround: (order: Order, delayDays?: number) => Remedy;
  /** One line the agent already names as the walk-away, if any. */
  unwindHint: (order: Order) => string | null;
  unwindMode: (order: Order) => UnwindMode;
  unwindLabel: (order: Order) => string | null;
  applyContinue: (order: Order, inc: Incident) => Order;
  unwindResolution: (order: Order, inc: Incident) => { resolution: string; event: string };
}

function remainderOpen(inv: Invoice): boolean {
  return inv.kind === "remainder" && inv.status !== "paid" && inv.status !== "cancelled";
}

function bumpRemainder(order: Order, delta: number): Invoice[] {
  if (!delta) return order.invoices;
  return order.invoices.map((inv) =>
    remainderOpen(inv) ? { ...inv, amount: Math.max(0, inv.amount + delta) } : inv,
  );
}

function bumpEta(order: Order, days: number): Shipment[] {
  if (!days) return order.shipments;
  return order.shipments.map((s) => (s.status === "arrived" ? s : { ...s, etaDays: s.etaDays + days }));
}

function addDoc(order: Order, doc: Omit<TradeDocument, "id" | "at">): TradeDocument[] {
  return [...order.documents, { ...doc, id: uid("doc"), at: new Date().toISOString() }];
}

function withEvent(order: Order, text: string): Order {
  return {
    ...order,
    events: [
      ...order.events,
      { id: uid("ev"), at: new Date().toISOString(), delayMs: 0, stage: "dispute", text },
    ],
  };
}

function paid(order: Order): boolean {
  return order.invoices.some((i) => i.kind === "advance" && i.status === "paid");
}

function delayShip(order: Order, delayDays = 2): Remedy {
  const pct = Math.min(5, Math.max(0.5, delayDays * 0.5));
  const amount = Math.round((order.total * pct) / 100);
  return {
    kind: "price_cut",
    amount,
    extraDays: delayDays,
    text: `Компенсация ${pct}% (${rub(amount)}) зачётом в остаток, срок +${delayDays} дн. Фура не разворачивается — ждём прибытие. Если обход мало: расторжение, аванс к возврату, рейтинг склада.`,
  };
}

function delayPay(order: Order, delayDays = 2): Remedy {
  const amount = Math.round((order.total * 0.1 * delayDays) / 100);
  const unpaid = order.status === "advance_due";
  return {
    kind: "penalty_hold",
    amount,
    extraDays: delayDays,
    text: unpaid
      ? `Пеня ${delayDays}×0,1% (${rub(amount)}) на остаток, резерв держим. Если денег так и нет — снимаем резерв, партии снова в поиске, рейтинг закупки после площадки.`
      : `Пеня ${delayDays}×0,1% (${rub(amount)}) к счёту остатка. Следующие партии — предоплата +10 п.п. Товар уже у клиента: отката заказа нет, только пеня.`,
  };
}

function shortage(order: Order): Remedy {
  const amount = Math.round(order.total * 0.05);
  return {
    kind: "credit_note",
    amount,
    extraDays: 5,
    text: `На рампе меньше, чем в накладной. Зачёт ${rub(amount)} в остаток и довоз из соседней партии за 5 дн. Не «подпишите как есть». Если довоз не нужен — возврат принятого, аванс к возврату, рейтинг склада.`,
  };
}

function quality(order: Order): Remedy {
  const amount = Math.round(order.total * 0.08);
  return {
    kind: "replace_lot",
    amount,
    extraDays: 10,
    text: `Партия не бьётся с паспортом. Замена со слота за 10 дн. или −8% (${rub(amount)}) в остаток при акте. Лаборатория — за виновную сторону. Иначе возврат груза, аванс к возврату, рейтинг.`,
  };
}

function docs(): Remedy {
  return {
    kind: "reissue_docs",
    extraDays: 1,
    text: "Перевыпуск накладной и УПД за 1 день. Без закрывающих сделка не закрывается. Если документов так и нет — отказ в приёмке, груз обратно, аванс к возврату.",
  };
}

function stockMiss(): Remedy {
  return {
    kind: "split_ship",
    extraDays: 7,
    text: "Лот-призрак: на складе меньше, чем в каталоге. Дробим — что есть, едет сейчас, недостающее со слота за 7 дн. Если частичной отгрузки мало: до аванса снимаем резерв; после — аванс к возврату и рейтинг склада.",
  };
}

function forceMajeure(): Remedy {
  return {
    kind: "extend_sla",
    extraDays: 5,
    text: "Форс-мажор по документу: срок +5 дн., рейтинг не трогаем. Если ждать нельзя — расторжение без удара по баллу: до аванса откат резерва, после — деньги к возврату.",
  };
}

export const INCIDENT_PLAYBOOK: Record<IncidentKind, KindPlaybook> = {
  delay_ship: {
    kind: "delay_ship",
    when: "Пока партия в пути или срок вышел — не после закрытия контура.",
    life: "Фура ещё едет или вышла позже срока. Полный объём обещан, но дата сдвинулась.",
    workaround: delayShip,
    unwindHint: (order) => (paid(order) ? "Расторжение: аванс к возврату, рейтинг склада." : null),
    unwindMode: (order) => (paid(order) ? "paid" : "none"),
    unwindLabel: (order) => (paid(order) ? "Расторгнуть · аванс к возврату" : null),
    applyContinue: (order, inc) => {
      const next = withEvent(
        {
          ...order,
          invoices: bumpRemainder(order, -(inc.proposed.amount ?? 0)),
          shipments: bumpEta(order, inc.proposed.extraDays ?? 0),
        },
        `Обход принят: зачёт в остаток ${rub(inc.proposed.amount ?? 0)}, прибытие +${inc.proposed.extraDays ?? 0} дн. Заказ живой.`,
      );
      return next;
    },
    unwindResolution: () => ({
      resolution: "Решение Atrium: срыв срока после аванса. Аванс к возврату, резерв снят, рейтинг поставщика обновлён.",
      event: "Площадка расторгла контур: опоздание после оплаты. Деньги к возврату, склад свободен.",
    }),
  },
  delay_pay: {
    kind: "delay_pay",
    when: "Пока ждут аванс или остаток.",
    life: "Счёт выставлен, денег нет. Склад не едет без аванса; после приёмки висит остаток.",
    workaround: delayPay,
    unwindHint: (order) =>
      order.status === "advance_due" ? "Откат: снять резерв, рейтинг закупки после площадки." : null,
    unwindMode: (order) => (order.status === "advance_due" ? "unpaid" : "none"),
    unwindLabel: (order) => (order.status === "advance_due" ? "Снять резерв · откат" : null),
    applyContinue: (order, inc) =>
      withEvent(
        { ...order, invoices: bumpRemainder(order, inc.proposed.amount ?? 0) },
        `Обход принят: пеня ${rub(inc.proposed.amount ?? 0)} в остатке. Резерв держим, ждём оплату.`,
      ),
    unwindResolution: () => ({
      resolution: "Решение Atrium: аванс так и не пришёл. Резерв снят, партии снова в поиске. Рейтинг закупщика обновлён.",
      event: "Площадка закрыла контур до оплаты: склад свободен, денег в контуре не было.",
    }),
  },
  shortage: {
    kind: "shortage",
    when: "На приёмке, пока акт не подписан «как есть».",
    life: "Фура на рампе: в накладной больше, чем приняли. Не лот-призрак на выходе — расхождение на входе.",
    workaround: shortage,
    unwindHint: () => "Возврат принятого, аванс к возврату, рейтинг склада.",
    unwindMode: (order) => (paid(order) ? "paid" : "none"),
    unwindLabel: (order) => (paid(order) ? "Вернуть груз · аванс к возврату" : null),
    applyContinue: (order, inc) => {
      const extra = inc.proposed.extraDays ?? 5;
      const restock: Shipment = {
        id: uid("shp"),
        carrier: "довоз из соседней партии",
        ttn: "довоз",
        vehicle: "догруз",
        from: order.allocations[0]?.warehouse ?? "склад поставщика",
        to: order.destination,
        etaDays: extra,
        status: "planned",
      };
      return withEvent(
        {
          ...order,
          invoices: bumpRemainder(order, -(inc.proposed.amount ?? 0)),
          shipments: [...order.shipments, restock],
          documents: addDoc(order, { kind: "acceptance", title: "Акт расхождения", ref: `зачёт ${rub(inc.proposed.amount ?? 0)}` }),
        },
        `Обход принят: акт расхождения, зачёт ${rub(inc.proposed.amount ?? 0)}, довоз через ${extra} дн.`,
      );
    },
    unwindResolution: () => ({
      resolution: "Решение Atrium: недостача на приёмке. Груз к возврату, аванс к возврату, рейтинг поставщика обновлён.",
      event: "Площадка расторгла контур по акту расхождения. Склад свободен, деньги к возврату.",
    }),
  },
  quality: {
    kind: "quality",
    when: "На приёмке, если паспорт не бьётся с грузом.",
    life: "Товар приехал, спецификация или паспорт не сходятся. Нужен акт, иногда лаборатория.",
    workaround: quality,
    unwindHint: () => "Возврат партии, аванс к возврату, рейтинг склада.",
    unwindMode: (order) => (paid(order) ? "paid" : "none"),
    unwindLabel: (order) => (paid(order) ? "Вернуть партию · аванс к возврату" : null),
    applyContinue: (order, inc) =>
      withEvent(
        {
          ...order,
          invoices: bumpRemainder(order, -(inc.proposed.amount ?? 0)),
          shipments: bumpEta(order, inc.proposed.extraDays ?? 0),
          documents: addDoc(order, {
            kind: "cert",
            title: "Акт качества / замена партии",
            ref: `−8% ${rub(inc.proposed.amount ?? 0)} или замена +${inc.proposed.extraDays ?? 10} дн.`,
          }),
        },
        `Обход принят: акт качества, зачёт ${rub(inc.proposed.amount ?? 0)}, замена/срок +${inc.proposed.extraDays ?? 10} дн.`,
      ),
    unwindResolution: () => ({
      resolution: "Решение Atrium: качество не бьётся с паспортом. Партия к возврату, аванс к возврату, рейтинг обновлён.",
      event: "Площадка расторгла контур по качеству. Склад свободен, деньги к возврату.",
    }),
  },
  docs: {
    kind: "docs",
    when: "На приёмке, если нет УПД, ТТН или паспорта.",
    life: "Груз на рампе, в контуре нет закрывающих. Без них приёмку не подписывают.",
    workaround: docs,
    unwindHint: () => "Отказ в приёмке, груз обратно, аванс к возврату.",
    unwindMode: (order) => (paid(order) ? "paid" : "none"),
    unwindLabel: (order) => (paid(order) ? "Отказать в приёмке · возврат" : null),
    applyContinue: (order, inc) =>
      withEvent(
        {
          ...order,
          shipments: bumpEta(order, inc.proposed.extraDays ?? 1),
          documents: [
            ...addDoc(order, { kind: "ttn", title: "ТТН (перевыпуск)", ref: "закрывающие за 1 день" }),
            { id: uid("doc"), kind: "upd", title: "УПД (перевыпуск)", ref: rub(order.total), at: new Date().toISOString() },
          ],
        },
        "Обход принят: накладная и УПД перевыпущены. Можно подписывать приёмку.",
      ),
    unwindResolution: () => ({
      resolution: "Решение Atrium: закрывающих нет. Отказ в приёмке, груз к возврату, аванс к возврату, рейтинг обновлён.",
      event: "Площадка расторгла контур: без УПД/ТТН сделка не закрывается.",
    }),
  },
  stock_miss: {
    kind: "stock_miss",
    when: "До отгрузки или уже после аванса, если склад не подтвердил лот.",
    life: "В каталоге был свободный остаток. На комплектации ячейка пустее: часть есть, полного лота нет.",
    workaround: stockMiss,
    unwindHint: (order) =>
      paid(order)
        ? "Расторжение: аванс к возврату, рейтинг склада."
        : "Откат до оплаты: снять резерв, рейтинг после площадки.",
    unwindMode: (order) => (paid(order) ? "paid" : order.status === "advance_due" ? "unpaid" : "none"),
    unwindLabel: (order) =>
      paid(order) ? "Расторгнуть · аванс к возврату" : order.status === "advance_due" ? "Снять резерв · откат" : null,
    applyContinue: (order, inc) => {
      const extra = inc.proposed.extraDays ?? 7;
      const restock: Shipment = {
        id: uid("shp"),
        carrier: "вторая волна со слота производства",
        ttn: "довоз",
        vehicle: "догруз",
        from: order.allocations[0]?.warehouse ?? "склад поставщика",
        to: order.destination,
        etaDays: extra,
        status: "planned",
      };
      return withEvent(
        { ...order, shipments: [...order.shipments, restock] },
        `Обход принят: что есть — в этой отгрузке, недостающее со слота через ${extra} дн.`,
      );
    },
    unwindResolution: (order) =>
      paid(order)
        ? {
            resolution:
              "Решение Atrium: лот не подтвердился после аванса. Аванс к возврату, резерв снят, рейтинг склада обновлён. Это не откат до оплаты.",
            event: "Площадка расторгла контур после аванса: возврат денег, склад свободен.",
          }
        : {
            resolution: "Решение Atrium: лот-призрак до оплаты. Резерв снят, партии снова в поиске. Рейтинг склада обновлён.",
            event: "Площадка закрыла контур до аванса: склад свободен, денег не было.",
          },
  },
  force_majeure: {
    kind: "force_majeure",
    when: "Пока заказ живой и есть документ о причине.",
    life: "Погода, простой комбината, перекрытая трасса. Есть справка — это не обычный срыв срока.",
    workaround: forceMajeure,
    unwindHint: (order) =>
      paid(order)
        ? "Расторжение без рейтинга: аванс к возврату, склад свободен."
        : "Откат без рейтинга: снять резерв.",
    unwindMode: (order) => (paid(order) ? "paid" : order.status === "advance_due" ? "unpaid" : "none"),
    unwindLabel: (order) =>
      paid(order) ? "Расторгнуть без рейтинга" : order.status === "advance_due" ? "Снять резерв без рейтинга" : null,
    applyContinue: (order, inc) =>
      withEvent(
        { ...order, shipments: bumpEta(order, inc.proposed.extraDays ?? 5) },
        `Обход принят: форс-мажор, срок +${inc.proposed.extraDays ?? 5} дн. Рейтинг не трогаем.`,
      ),
    unwindResolution: (order) =>
      paid(order)
        ? {
            resolution: "Решение Atrium: форс-мажор, ждать нельзя. Аванс к возврату, резерв снят. Рейтинг не трогаем — есть документ.",
            event: "Площадка расторгла контур по форс-мажору. Деньги к возврату, рейтинг без удара.",
          }
        : {
            resolution: "Решение Atrium: форс-мажор до оплаты. Резерв снят. Рейтинг не трогаем — есть документ.",
            event: "Площадка закрыла контур до аванса по форс-мажору. Склад свободен, рейтинг без удара.",
          },
  },
};

export function playbookOf(kind: IncidentKind): KindPlaybook {
  return INCIDENT_PLAYBOOK[kind];
}

export function proposeRemedy(kind: IncidentKind, delayDays = 2, orderTotal = 0, order?: Order): Remedy {
  const stub =
    order ??
    ({
      total: orderTotal,
      status: "in_transit",
      invoices: [],
      allocations: [],
      destination: "",
    } as unknown as Order);
  return playbookOf(kind).workaround(stub, delayDays);
}

export function unwindModeOf(order: Order, kind: IncidentKind): UnwindMode {
  return playbookOf(kind).unwindMode(order);
}

export const KIND_WHEN: Record<IncidentKind, string> = {
  delay_ship: INCIDENT_PLAYBOOK.delay_ship.when,
  delay_pay: INCIDENT_PLAYBOOK.delay_pay.when,
  shortage: INCIDENT_PLAYBOOK.shortage.when,
  quality: INCIDENT_PLAYBOOK.quality.when,
  docs: INCIDENT_PLAYBOOK.docs.when,
  stock_miss: INCIDENT_PLAYBOOK.stock_miss.when,
  force_majeure: INCIDENT_PLAYBOOK.force_majeure.when,
};

export const KIND_LIFE: Record<IncidentKind, string> = {
  delay_ship: INCIDENT_PLAYBOOK.delay_ship.life,
  delay_pay: INCIDENT_PLAYBOOK.delay_pay.life,
  shortage: INCIDENT_PLAYBOOK.shortage.life,
  quality: INCIDENT_PLAYBOOK.quality.life,
  docs: INCIDENT_PLAYBOOK.docs.life,
  stock_miss: INCIDENT_PLAYBOOK.stock_miss.life,
  force_majeure: INCIDENT_PLAYBOOK.force_majeure.life,
};
