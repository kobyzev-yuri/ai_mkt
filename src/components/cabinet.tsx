"use client";

import Link from "next/link";
import { IdeaStub, MessengerPreview } from "@/components/idea-stub";
import { TradePolicyEditor } from "@/components/trade-policy";
import { Badge, Stat } from "@/components/ui";
import { companyById, productById } from "@/lib/agents";
import { compactRub, dealStatusLabel, deliveryLine, orderStatusLabel, rating } from "@/lib/format";
import { LEAD_LABEL, sellerLeads } from "@/lib/leads";
import { partnerDossier } from "@/lib/partner-context";
import { CONTROL_MODE_LABEL, policyOf } from "@/lib/policy";
import { companies } from "@/lib/seed";
import { MESSENGER_PREVIEW, STUBS } from "@/lib/stubs";
import { useStore } from "@/lib/store";
import { trustOf } from "@/lib/trust";
import { counterpartiesOf } from "@/lib/workspace";

export function Cabinet({ side }: { side: "buy" | "sell" }) {
  const { company, deals, rfqs, orders, reputations, policies, setCompany, setPolicy } = useStore();
  const isSeller = side === "sell";
  const mine = deals.filter((d) => (isSeller ? d.sellerId === company.id : d.buyerId === company.id));
  const won = mine.filter((d) => d.status === "approved");
  const volume = won.reduce((s, d) => s + d.currentPrice * d.qty, 0);
  const myOrders = orders.filter((o) => (isSeller ? o.sellerId === company.id : o.buyerId === company.id));
  const partners = counterpartiesOf(company.id, deals, orders, reputations);
  const liveDeals = mine.filter((d) => d.status !== "rejected");
  const leads = isSeller ? sellerLeads(deals, company.id, orders, reputations, policies) : null;
  const policy = policyOf(company, policies);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">
        {isSeller ? "Кабинет поставщика" : "Кабинет закупщика"}
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl">{company.name}</h1>
          <p className="mt-2 max-w-2xl text-muted">
            {isSeller
              ? "Подходящие заявки приходят сами. Агент отвечает в мандате и не продаёт ниже пола. Вам — только крупные или спорные лиды."
              : `${company.city} · ${company.industry} · ИНН ${company.inn} · каталог ${rating(company.rating)} · доверие ${trustOf(company.id, reputations).score} · оплата ${trustOf(company.id, reputations).onTimePayPct}%`}
          </p>
        </div>
        {isSeller ? (
          <Link href="#leads" className="rounded-full bg-brass px-5 py-2.5 text-[13px] font-medium text-bg hover:bg-brass-2">
            Открыть лиды
          </Link>
        ) : (
          <Link href="/rfq" className="rounded-full bg-brass px-5 py-2.5 text-[13px] font-medium text-bg hover:bg-brass-2">
            Новая заявка
          </Link>
        )}
      </div>

      <div id="policy" className="mt-8 border border-brass/30 bg-surface p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-brass">Агент «{company.agent.name}»</p>
        <p className="mt-2 font-display text-2xl">Мандат и политика {isSeller ? "поставки" : "закупки"}</p>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">{company.agent.mandate}</p>
        <p className="mt-3 font-mono text-[11px] text-muted">
          {CONTROL_MODE_LABEL[policy.controlMode]} · тон {company.agent.tone} · приоритет {company.agent.priority} ·
          допуск {compactRub(policy.autoApproveBelow)} · мин. доверие {policy.minTrustToAuto}
        </p>
        <TradePolicyEditor policy={policy} onChange={setPolicy} />
      </div>

      <div className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-4">
        <Stat
          label={isSeller ? "Новые лиды" : "Мои заявки"}
          value={String(isSeller ? (leads?.incoming.length ?? 0) : rfqs.filter((r) => r.buyerId === company.id).length)}
        />
        <Stat
          label={isSeller ? "Нужен человек" : "Утверждено"}
          value={String(isSeller ? (leads?.incoming.filter((x) => x.tag === "needs-you").length ?? 0) : won.length)}
        />
        <Stat
          label={isSeller ? "Пропущено" : "В исполнении"}
          value={String(isSeller ? (leads?.missed.length ?? 0) : myOrders.filter((o) => o.status !== "settled").length)}
        />
        <Stat label={isSeller ? "Оборот с лидов" : "Оборот с контрагентами"} value={compactRub(volume)} />
      </div>

      {isSeller && leads ? (
        <section id="leads" className="mt-12">
          <h2 className="font-display text-3xl">Лиды, которые можно продать</h2>
          <p className="mt-2 max-w-2xl text-[14px] text-muted">
            Агент «{company.agent.name}» уже в комнатах. Режим «{CONTROL_MODE_LABEL[policy.controlMode]}». Выше допуска{" "}
            {compactRub(policy.autoApproveBelow)} или слабые оплаты клиента — колокольчик.
            Ниже пола маржи лид в «пропущено»: спрос виден, демпинга нет.
          </p>
          <div className="mt-5 divide-y divide-line border border-line">
            {leads.incoming.length + leads.missed.length === 0 ? (
              <p className="bg-surface px-4 py-8 text-[14px] text-muted">
                Пока нет входящих заявок на ваши партии. Когда закупщик запустит RFQ — лид появится здесь, не в почте.
              </p>
            ) : (
              [...leads.incoming, ...leads.missed].map(({ deal, tag }) => {
                const p = productById(deal.productId);
                const dossier = partnerDossier(company.id, deal.buyerId, deals, orders, reputations);
                return (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="flex flex-col gap-1 bg-surface px-4 py-4 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Badge tone={tag === "missed" ? "terra" : tag === "needs-you" ? "brass" : "live"}>
                        {LEAD_LABEL[tag]}
                      </Badge>
                      <p className="mt-2 font-display text-xl">{p.name}</p>
                      <p className="text-[13px] text-muted">
                        {dossier.other.short} · оплаты {dossier.onTimePayPct}% · {deal.destination}
                      </p>
                    </div>
                    <p className="font-mono text-brass">{compactRub(deal.currentPrice * deal.qty)}</p>
                  </Link>
                );
              })
            )}
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <IdeaStub stub={STUBS.messenger} preview={<MessengerPreview text={MESSENGER_PREVIEW} />} />
            <IdeaStub stub={STUBS.onec} />
          </div>
        </section>
      ) : null}

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl">Контрагенты</h2>
            <p className="mt-2 max-w-xl text-[14px] text-muted">
              {isSeller
              ? "Закупщики, которые уже принесли заявку. Не общая витрина — ваши лиды."
              : "Поставщики, с которыми открыты комнаты и заказы. Здесь работаете вы, не бэкофис площадки."}
            </p>
          </div>
          <Link href="/companies" className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-brass">
            Все участники →
          </Link>
        </div>
        <div className="mt-5 divide-y divide-line border border-line">
          {partners.length === 0 ? (
            <div className="bg-surface px-4 py-8 text-[14px] text-muted">
              <p>
                {isSeller
                  ? "Пока нет закупщиков в работе. Когда контрагент запустит заявку, он появится здесь."
                  : "Пока нет поставщиков у этой организации. Запустите заявку — или откройте кабинет, где в демо уже есть комнаты."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {companies
                  .filter((c) => (isSeller ? c.role !== "buyer" : c.role !== "seller") && c.id !== company.id)
                  .filter((c) => counterpartiesOf(c.id, deals, orders, reputations).length > 0)
                  .slice(0, 4)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCompany(c.id)}
                      className="rounded-full border border-line px-3 py-1.5 font-mono text-[11px] text-paper hover:border-brass/50"
                    >
                      {c.short}
                    </button>
                  ))}
              </div>
            </div>
          ) : (
            partners.map((row) => {
              const dossier = partnerDossier(company.id, row.company.id, deals, orders, reputations);
              return (
              <Link
                key={row.company.id}
                href={`/companies/${row.company.id}`}
                className="flex flex-col gap-2 bg-surface px-4 py-4 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-display text-xl">{row.company.short}</p>
                  <p className="text-[13px] text-muted">
                    {row.company.city} · {dossier.headline}
                  </p>
                </div>
                <p className="font-mono text-[12px] text-brass">
                  {isSeller ? `оплаты ${dossier.onTimePayPct}%` : `отгрузки ${dossier.onTimeShipPct}%`} ·{" "}
                  {compactRub(row.volume)}
                </p>
              </Link>
              );
            })
          )}
        </div>
      </section>

      {!isSeller ? (
        <section className="mt-12">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-3xl">Активные закупки</h2>
            <Link href="/deals" className="font-mono text-[11px] uppercase tracking-widest text-brass">
              Все сделки →
            </Link>
          </div>
          <div className="mt-5 divide-y divide-line border border-line">
            {liveDeals.length === 0 ? (
              <p className="bg-surface px-4 py-8 text-[14px] text-muted">
                Запустите агента закупки — комнаты с поставщиками появятся здесь.
              </p>
            ) : (
              liveDeals.map((d) => {
                const p = productById(d.productId);
                const dossier = partnerDossier(company.id, d.sellerId, deals, orders, reputations);
                return (
                  <Link
                    key={d.id}
                    href={`/deals/${d.id}`}
                    className="flex flex-col gap-1 bg-surface px-4 py-4 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Badge
                        tone={
                          d.status === "agreed" || d.status === "approved"
                            ? "moss"
                            : d.status === "rejected"
                              ? "terra"
                              : "live"
                        }
                      >
                        {dealStatusLabel(d.status)}
                      </Badge>
                      <p className="mt-2 font-display text-xl">{p.name}</p>
                      <p className="text-[13px] text-muted">
                        {dossier.other.short} · отгрузки {dossier.onTimeShipPct}% · доверие {dossier.score}
                      </p>
                    </div>
                    <p className="font-mono text-brass">{compactRub(d.currentPrice * d.qty)}</p>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      ) : null}

      <section className="mt-12">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl">Исполнение с контрагентами</h2>
          <Link href="/orders" className="font-mono text-[11px] uppercase tracking-widest text-brass">
            Все заказы →
          </Link>
        </div>
        <div className="mt-5 divide-y divide-line border border-line">
          {myOrders.length === 0 ? (
            <p className="bg-surface px-4 py-8 text-[14px] text-muted">
              Утвердите сделку — появится счёт, резерв партий и отгрузка.
            </p>
          ) : (
            myOrders.map((o) => {
              const p = productById(o.productId);
              const other = companyById(isSeller ? o.buyerId : o.sellerId);
              return (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className="flex flex-col gap-1 bg-surface px-4 py-4 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Badge tone={o.status === "settled" ? "moss" : "live"}>{orderStatusLabel(o.status)}</Badge>
                    <p className="mt-2 font-display text-xl">{p.name}</p>
                    <p className="text-[13px] text-muted">
                      {other.short} · {deliveryLine(o.incoterm, o.destination)}
                    </p>
                  </div>
                  <p className="font-mono text-brass">{compactRub(o.total)}</p>
                </Link>
              );
            })
          )}
        </div>
        {isSeller ? (
          <div className="mt-6">
            <IdeaStub stub={STUBS.edo} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
