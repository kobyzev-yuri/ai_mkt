"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AgentMark, Badge } from "@/components/ui";
import { companyById, productById } from "@/lib/agents";
import { compactRub, days, dealStatusLabel, deliveryLine, qty, rub, when } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Actor, Deal } from "@/lib/types";
import { tacticLabel } from "@/lib/bargain";
import { veilChat } from "@/lib/veil-chat";

export default function DealRoomPage() {
  const { id } = useParams<{ id: string }>();
  const { deals, approveDeal, rejectDeal, company } = useStore();
  const deal = deals.find((d) => d.id === id);

  if (!deal) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-muted">Комната не найдена. Возможно, демо сброшено.</p>
        <Link href="/deals" className="mt-4 inline-block text-brass">
          К сделкам
        </Link>
      </div>
    );
  }

  return <Room key={deal.id} deal={deal} companyId={company.id} onApprove={approveDeal} onReject={rejectDeal} />;
}

function Room({
  deal,
  companyId,
  onApprove,
  onReject,
}: {
  deal: Deal;
  companyId: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const product = productById(deal.productId);
  const seller = companyById(deal.sellerId);
  const buyer = companyById(deal.buyerId);
  const [shown, setShown] = useState(deal.playback ? 1 : deal.messages.length);

  useEffect(() => {
    if (!deal.playback) return;
    if (shown >= deal.messages.length) return;
    const delay = deal.messages[shown]?.delayMs ?? 1100;
    const t = setTimeout(() => setShown((n) => n + 1), delay);
    return () => clearTimeout(t);
  }, [shown, deal.playback, deal.messages]);

  const visible = deal.messages.slice(0, shown);
  const playing = deal.playback && shown < deal.messages.length;
  const iAmSeller = companyId === deal.sellerId;
  const iAmParty = companyId === deal.buyerId || companyId === deal.sellerId;
  const viewer = iAmSeller ? "seller" : "buyer";
  const canApprove = !playing && deal.status === "agreed" && iAmParty;
  const canReject =
    !playing && iAmParty && (deal.status === "agreed" || deal.status === "countering");

  const span = iAmSeller
    ? Math.max(deal.listPrice - deal.floorPrice, deal.listPrice * 0.12)
    : Math.max(deal.listPrice - deal.currentPrice, deal.listPrice * 0.12);
  const min = iAmSeller ? deal.floorPrice - span * 0.05 : deal.currentPrice - span * 0.15;
  const max = deal.listPrice + span * 0.08;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  const own = iAmSeller ? seller : buyer;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1.15fr_0.85fr]">
      <section>
        <Link href="/deals" className="font-mono text-[11px] uppercase tracking-widest text-muted">
          ← Все комнаты
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge tone={deal.status === "rejected" ? "terra" : deal.status === "approved" ? "moss" : "live"}>
            {playing ? "Агенты переписываются" : dealStatusLabel(deal.status)}
          </Badge>
          {deal.voicedBy ? <Badge tone="brass">{deal.voicedBy}</Badge> : null}
          <span className="font-mono text-[11px] text-muted">
            {buyer.short} · агент «{buyer.agent.name}» ↔ {seller.short} · агент «{seller.agent.name}»
          </span>
        </div>
        <h1 className="mt-4 font-display text-4xl leading-tight">{product.name}</h1>
        <p className="mt-2 text-muted">
          {qty(deal.qty, product.unit)} · {compactRub(deal.currentPrice * deal.qty)}
        </p>

        <ol className="mt-8 space-y-4">
          {visible.map((m) => (
            <li key={m.id} className="rise flex gap-3">
              {m.from === "system" ? (
                <div className="w-full border border-dashed border-line px-4 py-3 font-mono text-[12px] leading-relaxed text-muted">
                  {veilChat(m.text, viewer)}
                </div>
              ) : (
                <>
                  <AgentMark name={m.from === "buyer-agent" ? buyer.agent.name : seller.agent.name} />
                  <div className="flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                      {who(m.from, buyer.agent.name, seller.agent.name)} · {when(m.at)}
                    </p>
                    <p className="mt-1 text-[14px] leading-relaxed text-paper/90">{veilChat(m.text, viewer)}</p>
                  </div>
                </>
              )}
            </li>
          ))}
        </ol>
        {playing && (
          <p className="mt-6 font-mono text-[11px] text-brass">агенты печатают…</p>
        )}

        {deal.status === "agreed" && !playing ? (
          <p className="mt-8 border border-brass/40 bg-surface px-4 py-3 text-[14px] leading-relaxed text-muted">
            Торг закрыт. На столе одно предложение — {qty(deal.qty, product.unit)} × {rub(deal.currentPrice)}.
            Пол и маржа поставщика в эту комнату не входят.
          </p>
        ) : null}
        {canApprove || canReject ? (
          <div className="mt-8 flex flex-wrap gap-3">
            {canApprove ? (
              <button
                type="button"
                onClick={() => onApprove(deal.id)}
                className="rounded-full bg-brass px-5 py-2.5 text-[13px] font-medium text-bg"
              >
                Утвердить сделку
              </button>
            ) : null}
            {canReject ? (
              <button
                type="button"
                onClick={() => onReject(deal.id)}
                className="rounded-full border border-line px-5 py-2.5 text-[13px] text-muted hover:text-terra"
              >
                Отклонить
              </button>
            ) : null}
          </div>
        ) : null}
        {deal.status === "approved" && (
          <p className="mt-8 border border-moss/40 bg-surface px-4 py-3 text-[14px] text-moss">
            Сделка утверждена. Запущен контур исполнения: счёт, резерв партий, отгрузка.
            {deal.orderId ? (
              <>
                {" "}
                <Link href={`/orders/${deal.orderId}`} className="underline underline-offset-4">
                  Открыть заказ →
                </Link>
              </>
            ) : null}
          </p>
        )}
        {deal.status === "rejected" && !playing && (
          <p className="mt-8 border border-terra/30 bg-surface px-4 py-3 text-[14px] text-terra">
            Мандаты не пересеклись — или человек отклонил. Агент может открыть заявку другому поставщику.
          </p>
        )}
      </section>

      <aside className="space-y-4">
        <div className="border border-line bg-surface p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {iAmSeller ? "Лестница и ваш пол" : "Условия на столе"}
          </p>
          <div className="relative mt-6 h-2 rounded-full bg-line">
            {iAmSeller ? (
              <div
                className="absolute top-0 h-2 rounded-full bg-brass/40"
                style={{
                  left: `${pct(deal.floorPrice)}%`,
                  width: `${Math.max(4, pct(deal.listPrice) - pct(deal.floorPrice))}%`,
                }}
              />
            ) : null}
            {iAmSeller ? <Mark left={pct(deal.floorPrice)} label="пол" /> : null}
            <Mark left={pct(deal.currentPrice)} label="сейчас" accent />
            <Mark left={pct(deal.listPrice)} label="лист" />
          </div>
          <dl className="mt-10 grid grid-cols-2 gap-3 text-[13px]">
            <Pair k="Лист" v={rub(deal.listPrice)} />
            <Pair k="Текущая" v={rub(deal.currentPrice)} />
            {iAmSeller ? <Pair k="Ваш пол" v={rub(deal.floorPrice)} /> : null}
            <Pair k="Сумма" v={compactRub(deal.currentPrice * deal.qty)} />
            <Pair k="Срок" v={days(deal.leadDays)} />
            <Pair k="Предоплата" v={`${deal.prepayPct}%`} />
            <Pair k="Поставка" v={deliveryLine(deal.incoterm, deal.destination)} />
            <Pair k="Места" v={`${deal.packCount}`} />
          </dl>
        </div>

        <div className="border border-line bg-surface p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Ваш мандат</p>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            <span className="text-paper">«{own.agent.name}».</span> {own.agent.mandate}
          </p>
          <p className="mt-3 font-mono text-[11px] text-brass">
            Тактика «{own.agent.name}»: {tacticLabel(iAmSeller ? deal.sellerTactic ?? seller.agent.tactic : deal.buyerTactic ?? buyer.agent.tactic)}
            {" · "}
            контрагент: {tacticLabel(iAmSeller ? deal.buyerTactic ?? buyer.agent.tactic : deal.sellerTactic ?? seller.agent.tactic)}
          </p>
          <p className="mt-3 font-mono text-[11px] text-muted">
            Стиль торга виден. Пол, маржа и потолок — нет.
          </p>
        </div>

        <div className="border border-line bg-surface p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Почему этот подбор</p>
          <ul className="mt-3 space-y-1 text-[13px] text-muted">
            {deal.matchReasons.map((r) => (
              <li key={r}>· {r}</li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[11px] text-brass">оценка агента {deal.score}/100</p>
          <Link href={`/catalog/${product.id}`} className="mt-3 inline-block text-[13px] text-paper underline-offset-4 hover:underline">
            Карточка позиции
          </Link>
        </div>
      </aside>
    </div>
  );
}

function who(from: Actor, buyer: string, seller: string): string {
  if (from === "buyer-agent") return `Агент «${buyer}»`;
  if (from === "seller-agent") return `Агент «${seller}»`;
  if (from === "human") return "Человек";
  return "Система";
}

function Pair({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">{k}</dt>
      <dd className="mt-0.5">{v}</dd>
    </div>
  );
}

function Mark({ left, label, accent }: { left: number; label: string; accent?: boolean }) {
  return (
    <span
      className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${accent ? "bg-brass-2" : "bg-muted"}`}
      style={{ left: `${left}%` }}
      title={label}
    >
      <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-wider text-muted">
        {label}
      </span>
    </span>
  );
}
