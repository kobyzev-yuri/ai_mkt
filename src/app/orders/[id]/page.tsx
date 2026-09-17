"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Pipeline } from "@/components/pipeline";
import { DocumentPack } from "@/components/document-pack";
import { IncidentsPanel } from "@/components/incidents";
import { PartnerContextCard } from "@/components/partner-context";
import { Badge } from "@/components/ui";
import { companyById, productById } from "@/lib/agents";
import { compactRub, days, deliveryLine, num, orderStatusLabel, qty, rub, when } from "@/lib/format";
import { packLabel } from "@/lib/packing";
import { partnerDossier } from "@/lib/partner-context";
import { useStore } from "@/lib/store";
import { trustOf } from "@/lib/trust";
import type { IncidentKind, Order } from "@/lib/types";

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { orders, deals, company, reputations, payAdvance, acceptDelivery, payRemainder, reportIncident, acceptIncidentRemedy, escalateOrderIncident, resolveOnPlatform } =
    useStore();
  const order = orders.find((o) => o.id === id);
  if (!order) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-muted">Заказ не найден.</p>
        <Link href="/orders" className="mt-4 inline-block text-brass">
          К партиям
        </Link>
      </div>
    );
  }
  return (
    <Room
      key={order.id + order.status}
      order={order}
      companyId={company.id}
      onPayAdvance={payAdvance}
      onAccept={acceptDelivery}
      onPayRemainder={payRemainder}
      onReport={(kind) => reportIncident(order.id, kind)}
      onAcceptRemedy={(incId) => acceptIncidentRemedy(order.id, incId)}
      onEscalate={(incId) => escalateOrderIncident(order.id, incId)}
      onPlatform={(incId) => resolveOnPlatform(order.id, incId)}
      sellerScore={trustOf(order.sellerId, reputations).score}
      buyerScore={trustOf(order.buyerId, reputations).score}
      sellerDossier={partnerDossier(order.buyerId, order.sellerId, deals, orders, reputations)}
      buyerDossier={partnerDossier(order.sellerId, order.buyerId, deals, orders, reputations)}
    />
  );
}

function Room({
  order,
  companyId,
  onPayAdvance,
  onAccept,
  onPayRemainder,
  onReport,
  onAcceptRemedy,
  onEscalate,
  onPlatform,
  sellerScore,
  buyerScore,
  sellerDossier,
  buyerDossier,
}: {
  order: Order;
  companyId: string;
  onPayAdvance: (id: string) => void;
  onAccept: (id: string) => void;
  onPayRemainder: (id: string) => void;
  onReport: (kind: IncidentKind) => void;
  onAcceptRemedy: (id: string) => void;
  onEscalate: (id: string) => void;
  onPlatform: (id: string) => void;
  sellerScore: number;
  buyerScore: number;
  sellerDossier: ReturnType<typeof partnerDossier>;
  buyerDossier: ReturnType<typeof partnerDossier>;
}) {
  const product = productById(order.productId);
  const seller = companyById(order.sellerId);
  const buyer = companyById(order.buyerId);
  const [shown, setShown] = useState(order.playback ? Math.max(1, order.events.length - 5) : order.events.length);

  useEffect(() => {
    if (!order.playback) return;
    if (shown >= order.events.length) return;
    const delay = order.events[shown]?.delayMs ?? 1100;
    const t = setTimeout(() => setShown((n) => n + 1), delay);
    return () => clearTimeout(t);
  }, [shown, order.playback, order.events]);

  const visible = order.events.slice(0, order.playback ? shown : order.events.length);
  const playing = order.playback && shown < order.events.length;
  const party = companyId === order.buyerId || companyId === order.sellerId;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1.15fr_0.85fr]">
      <section>
        <Link href="/orders" className="font-mono text-[11px] uppercase tracking-widest text-muted">
          ← Все партии
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge tone={order.status === "settled" ? "moss" : "live"}>{orderStatusLabel(order.status)}</Badge>
          <span className="font-mono text-[11px] text-muted">
            {buyer.short} ({buyerScore}) ↔ {seller.short} ({sellerScore})
          </span>
        </div>
        <h1 className="mt-4 font-display text-4xl leading-tight">{product.name}</h1>
        <p className="mt-2 text-muted">
          {packLabel(order.qty, product)} · {deliveryLine(order.incoterm, order.destination)} · {compactRub(order.total)}
        </p>
        <div className="mt-6">
          <Pipeline status={playing && order.status === "in_transit" ? "shipping" : order.status} />
        </div>

        <ol className="mt-8 space-y-3">
          {visible.map((e) => (
            <li key={e.id} className="rise border border-dashed border-line px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-brass">
                {e.stage} · {when(e.at)}
              </p>
              <p className="mt-1 text-[14px] leading-relaxed text-paper/90">{e.text}</p>
            </li>
          ))}
        </ol>
        {playing && <p className="mt-6 font-mono text-[11px] text-brass">логистика обновляется…</p>}

        {party && !playing && order.status === "advance_due" && (
          <button
            type="button"
            onClick={() => onPayAdvance(order.id)}
            className="mt-8 rounded-full bg-brass px-5 py-2.5 text-[13px] font-medium text-bg"
          >
            Агент казначейства оплачивает аванс
          </button>
        )}
        {party && !playing && (order.status === "in_transit" || order.status === "acceptance_due") && (
          <button
            type="button"
            onClick={() => onAccept(order.id)}
            className="mt-8 rounded-full bg-brass px-5 py-2.5 text-[13px] font-medium text-bg"
          >
            Подписать приёмку
          </button>
        )}
        {party && !playing && order.status === "remainder_due" && (
          <button
            type="button"
            onClick={() => onPayRemainder(order.id)}
            className="mt-8 rounded-full bg-brass px-5 py-2.5 text-[13px] font-medium text-bg"
          >
            Оплатить остаток
          </button>
        )}
        {order.status === "settled" && (
          <p className="mt-8 border border-moss/40 bg-surface px-4 py-3 text-[14px] text-moss">
            Контур закрыт: партии списаны, аванс и остаток оплачены, УПД и акт в архиве.
          </p>
        )}

        <div className="mt-8">
          <IncidentsPanel
            order={order}
            companyId={companyId}
            onReport={onReport}
            onAccept={onAcceptRemedy}
            onEscalate={onEscalate}
            onPlatform={onPlatform}
          />
        </div>
      </section>

      <aside className="space-y-4">
        <div className="border border-line bg-surface p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Партии</p>
          <ul className="mt-3 space-y-3">
            {order.allocations.map((a) => (
              <li key={a.lotId} className="text-[13px]">
                <p className="font-mono text-brass">{a.batchNo}</p>
                <p className="text-muted">
                  {qty(a.qty, product.unit)} · {a.warehouse}
                  {a.readyDays ? ` · готовность ${days(a.readyDays)}` : " · с наличия"}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-line bg-surface p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Оплата</p>
          <ul className="mt-3 space-y-2 text-[13px]">
            {order.invoices.map((inv) => (
              <li key={inv.id} className="flex justify-between gap-3">
                <span>
                  {inv.kind === "advance" ? "Аванс" : "Остаток"} {inv.number}
                  <span className="mt-0.5 block font-mono text-[10px] uppercase text-muted">{inv.status}</span>
                </span>
                <span className="font-mono text-brass">{rub(inv.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-muted">Схема {order.prepayPct}/{100 - order.prepayPct}</p>
        </div>
        {order.shipments[0] && (
          <div className="border border-line bg-surface p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Отгрузка</p>
            <p className="mt-2 font-display text-2xl">{order.shipments[0].ttn}</p>
            <p className="mt-1 text-[13px] text-muted">
              {order.shipments[0].from} → {order.shipments[0].to}
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted">
              {order.shipments[0].carrier} · {order.shipments[0].vehicle} · прибытие {days(order.shipments[0].etaDays)}
            </p>
          </div>
        )}
        <DocumentPack order={order} />
        <PartnerContextCard dossier={sellerDossier} href={`/companies/${order.sellerId}`} />
        <PartnerContextCard dossier={buyerDossier} href={`/companies/${order.buyerId}`} />
        <p className="font-mono text-[11px] text-muted">
          {num(order.packCount)} грузовых мест · {qty(order.qty, product.unit)}
        </p>
        <Link href={`/deals/${order.dealId}`} className="inline-block text-[13px] text-brass">
          Комната согласования →
        </Link>
      </aside>
    </div>
  );
}
