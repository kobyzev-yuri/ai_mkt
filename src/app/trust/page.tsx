"use client";

import Link from "next/link";
import { Badge, Stat } from "@/components/ui";
import { evaluateMarketplace } from "@/lib/effectiveness";
import { when } from "@/lib/format";
import { AGENT_ROLES } from "@/lib/scenarios";
import { companies } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { trustOf } from "@/lib/trust";
import type { AuditActor } from "@/lib/types";

const ACTOR: Record<AuditActor, string> = {
  orchestrator: "Оркестратор",
  parser: "Парсер",
  matcher: "Поиск",
  "buyer-agent": "Закупка",
  "seller-agent": "Поставка",
  mandate: "Мандат",
  fulfillment: "Исполнение",
  ops: "Инциденты",
  human: "Человек",
  platform: "Atrium",
};

export default function TrustPage() {
  const { reputations, orders, deals, auditLog } = useStore();
  const openInc = orders.flatMap((o) => (o.incidents ?? []).filter((i) => i.status !== "resolved"));
  const kpi = evaluateMarketplace(deals, orders, reputations);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Бэкофис · аналитика</p>
      <h1 className="mt-2 font-display text-5xl">Безопасность и оценка агентов</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
        Агентам нельзя «просто поверить». Мандат режет цену, человек подписывает деньги, LLM не двигает статус, рейтинг
        бьёт только площадка. Эффективность — не красноречие модели, а соблюдение пола, доля обходов и сколько раз нужен человек.
      </p>

      <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Комнаты согласованы" value={`${kpi.agreedPct}%`} hint={`${kpi.rooms} комнат в сессии`} />
        <Stat label="Пол цены соблюдён" value={`${kpi.mandateOkPct}%`} hint="current ≥ floor" />
        <Stat label="Обходы без арбитража" value={`${kpi.autoRemedyPct}%`} hint="инциденты, закрытые сторонами" />
        <Stat label="Подтверждений на закрытый заказ" value={String(kpi.humanGatesPerSettled)} hint="утвердить / аванс / приёмка / остаток" />
      </div>

      {openInc.length > 0 && (
        <p className="mt-6 border border-terra/40 bg-surface px-4 py-3 text-[14px]">
          Сейчас открыто инцидентов: {openInc.length}. Разберите{" "}
          <Link href={`/orders/${openInc[0].orderId}`} className="text-brass">
            заказ в исполнении
          </Link>
          .
        </p>
      )}

      <section className="mt-14">
        <h2 className="font-display text-3xl">Четыре механизма контроля</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            {
              t: "Мандат как политика",
              d: "Пол маржи, бюджет заявки, кратность упаковки, минимум предоплаты. Реплика агента не может продать ниже пола — статус считает движок.",
            },
            {
              t: "Песочница LLM",
              d: "Модель пишет формулировки и дополняет разбор заявки. Если вернула другой набор реплик или молчит — остаются числа движка.",
            },
            {
              t: "Подтверждения человека",
              d: "Утверждение, аванс, приёмка, остаток, эскалация. Склад не едет без оплаты. Агенты предлагают, не подписывают.",
            },
            {
              t: "Доказательный рейтинг",
              d: "Отгрузка и оплата в срок, доля претензий. Удар по баллу — только после решения Atrium по документам в заказе, не в момент сигнала.",
            },
          ].map((x) => (
            <div key={x.t} className="border border-line bg-surface p-5">
              <h3 className="font-display text-2xl">{x.t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-3xl">Карточки агентов</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Оценка подбора и доля согласованных комнат — про качество поиска. Соблюдение пола — про то, что агент не ломает
          мандат. Балл доверия — экономические последствия прошлых исполнений.
        </p>
        <div className="mt-6 overflow-x-auto border border-line">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="bg-surface font-mono text-[10px] uppercase tracking-widest text-muted">
              <tr>
                <th className="px-4 py-3 font-normal">Агент</th>
                <th className="px-4 py-3 font-normal">Комнаты</th>
                <th className="px-4 py-3 font-normal">Сошлись</th>
                <th className="px-4 py-3 font-normal">Пол мандата</th>
                <th className="px-4 py-3 font-normal">Оценка подбора</th>
                <th className="px-4 py-3 font-normal">Trust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {kpi.cards
                .filter((c) => c.rooms > 0)
                .map((c) => (
                  <tr key={c.companyId} className="bg-bg">
                    <td className="px-4 py-3">
                      <span className="text-paper">«{c.agent}»</span>
                      <span className="mt-0.5 block font-mono text-[10px] text-muted">
                        {c.short} · {c.role === "seller" ? "поставка" : "закупка"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{c.rooms}</td>
                    <td className="px-4 py-3 font-mono">{c.agreedPct}%</td>
                    <td className="px-4 py-3 font-mono">{c.mandateOkPct}%</td>
                    <td className="px-4 py-3 font-mono">{c.avgScore}</td>
                    <td className="px-4 py-3 font-display text-xl text-brass">{c.trust}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-3xl">Двустороннее доверие компаний</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Звёзды каталога — витрина. Рабочий балл: отгрузки в срок, оплаты в срок, претензии. Волга Ритейл с 78%
          оплаты сразу видит аванс 60%.
        </p>
        <div className="mt-6 overflow-x-auto border border-line">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="bg-surface font-mono text-[10px] uppercase tracking-widest text-muted">
              <tr>
                <th className="px-4 py-3 font-normal">Компания</th>
                <th className="px-4 py-3 font-normal">Роль</th>
                <th className="px-4 py-3 font-normal">Отгрузки в срок</th>
                <th className="px-4 py-3 font-normal">Оплаты в срок</th>
                <th className="px-4 py-3 font-normal">Претензии</th>
                <th className="px-4 py-3 font-normal">Сводный балл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {companies.map((c) => {
                const t = trustOf(c.id, reputations);
                return (
                  <tr key={c.id} className="bg-bg">
                    <td className="px-4 py-3">
                      <Link href={`/companies/${c.id}`} className="text-paper hover:text-brass">
                        {c.short}
                      </Link>
                      <span className="mt-0.5 block font-mono text-[10px] text-muted">{c.city}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={c.role === "seller" ? "brass" : "default"}>
                        {c.role === "seller" ? "поставщик" : "закупщик"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono">{t.onTimeShipPct}%</td>
                    <td className="px-4 py-3 font-mono">{t.onTimePayPct}%</td>
                    <td className="px-4 py-3 font-mono">{t.claimRatePct}%</td>
                    <td className="px-4 py-3 font-display text-xl text-brass">{t.score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-3xl">Журнал действий</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Контроль постфактум: кто что сделал, какой мандат сработал. Пишется при заявках, подтверждениях и инцидентах этой сессии.
        </p>
        {auditLog.length === 0 ? (
          <p className="mt-6 border border-line bg-surface px-4 py-6 text-[14px] text-muted">
            Журнал пуст. Запустите{" "}
            <Link href="/demo" className="text-brass">
              прогон
            </Link>{" "}
            или новую заявку — записи появятся здесь.
          </p>
        ) : (
          <ol className="mt-6 divide-y divide-line border border-line">
            {auditLog.slice(0, 18).map((e) => (
              <li key={e.id} className="grid gap-1 bg-bg px-4 py-3 sm:grid-cols-[7rem_8rem_1fr] sm:items-baseline">
                <span className="font-mono text-[11px] text-muted">{when(e.at)}</span>
                <span className="font-mono text-[11px] text-brass">{ACTOR[e.actor]}</span>
                <span>
                  <span className="text-[13px] text-paper">{e.action}</span>
                  <span className="mt-0.5 block text-[12px] text-muted">{e.detail}</span>
                  {e.constraint ? (
                    <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-terra">
                      {e.constraint}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-14">
        <h2 className="font-display text-3xl">Как выкручиваются, когда всё ломается</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            {
              t: "Срыв отгрузки",
              d: "Гарантия сделки: кредит за день просрочки, 7 дней на договорённость сторон, потом арбитр площадки. Рейтинг падает только после решения.",
            },
            {
              t: "Просрочка оплаты",
              d: "Поставщик поднимает предоплату, держит резерв, начисляет пеню. Волга Ритейл (78% оплат в срок) сразу видит аванс 60%.",
            },
            {
              t: "Недостача / качество при приёмке",
              d: "Акт + зачёт + довоз или замена лота. Без документов платформа претензию не берёт.",
            },
            {
              t: "Ложный остаток",
              d: "Дробная отгрузка или слот производства. Иначе отмена и удар по складу после арбитража.",
            },
            {
              t: "Накладная и УПД",
              d: "Перевыпуск за сутки. Без закрывающих сделка «закрыта» только на бумаге склада.",
            },
            {
              t: "Форс-мажор",
              d: "Сдвигаем срок. Рейтинг не трогаем, если справка в контуре; иначе это обычный срыв срока.",
            },
          ].map((x) => (
            <div key={x.t} className="border border-line bg-surface p-5">
              <h3 className="font-display text-2xl">{x.t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-10 text-[13px] text-muted">
        Роли на шине: {AGENT_ROLES.map((r) => r.name).join(" · ")}. Разбор слоёв — на странице{" "}
        <Link href="/concept" className="text-brass">
          концепции
        </Link>
        .
      </p>
    </div>
  );
}
