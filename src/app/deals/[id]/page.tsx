"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DocumentPackPreview } from "@/components/document-pack";
import { SpecSheet } from "@/components/spec-sheet";
import { PartnerContextCard } from "@/components/partner-context";
import { RejectCardView } from "@/components/reject-card";
import { AgentMark, Badge } from "@/components/ui";
import { companyById, productById } from "@/lib/agents";
import { compactRub, days, dealOutcomeLabel, deliveryLine, qty, rub, when } from "@/lib/format";
import { partnerDossier } from "@/lib/partner-context";
import { autoPassVerdict } from "@/lib/policy";
import { useStore } from "@/lib/store";
import type { Actor, Deal } from "@/lib/types";

export default function DealRoomPage() {
  const { id } = useParams<{ id: string }>();
  const { deals, orders, reputations, policies, approveDeal, rejectDeal, acceptSpec, company } = useStore();
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

  return (
    <Room
      key={`${deal.id}-${deal.status}-${deal.messages.length}`}
      deal={deal}
      companyId={company.id}
      onApprove={approveDeal}
      onReject={rejectDeal}
      onAcceptSpec={acceptSpec}
      verdict={autoPassVerdict(deal, orders, reputations, policies)}
      sellerDossier={partnerDossier(deal.buyerId, deal.sellerId, deals, orders, reputations)}
      buyerDossier={partnerDossier(deal.sellerId, deal.buyerId, deals, orders, reputations)}
    />
  );
}

function Room({
  deal,
  companyId,
  onApprove,
  onReject,
  onAcceptSpec,
  verdict,
  sellerDossier,
  buyerDossier,
}: {
  deal: Deal;
  companyId: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onAcceptSpec: (id: string) => void;
  verdict: ReturnType<typeof autoPassVerdict>;
  sellerDossier: ReturnType<typeof partnerDossier>;
  buyerDossier: ReturnType<typeof partnerDossier>;
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
  const party = companyId === deal.buyerId || companyId === deal.sellerId;
  const isSeller = companyId === deal.sellerId;
  const canApprove = !playing && deal.status === "agreed" && party;
  const canWalkAway = !playing && (deal.status === "agreed" || deal.status === "countering") && party;

  const span = Math.max(deal.listPrice - deal.floorPrice, deal.listPrice * 0.12);
  const min = (isSeller ? deal.floorPrice : Math.min(deal.currentPrice, deal.listPrice)) - span * 0.05;
  const max = deal.listPrice + span * 0.08;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[1.15fr_0.85fr]">
      <section>
        <Link href="/deals" className="font-mono text-[11px] uppercase tracking-widest text-muted">
          ← Все комнаты
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge tone={deal.status === "rejected" ? "terra" : deal.status === "approved" ? "moss" : "live"}>
            {playing ? "Агенты переписываются" : dealOutcomeLabel(deal)}
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
                  {m.text}
                </div>
              ) : (
                <>
                  <AgentMark name={m.from === "buyer-agent" ? buyer.agent.name : seller.agent.name} />
                  <div className="flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                      {who(m.from, buyer.agent.name, seller.agent.name)} · {when(m.at)}
                    </p>
                    <p className="mt-1 text-[14px] leading-relaxed text-paper/90">{m.text}</p>
                  </div>
                </>
              )}
            </li>
          ))}
        </ol>
        {playing && (
          <p className="mt-6 font-mono text-[11px] text-brass">агенты печатают…</p>
        )}

        {!playing && deal.status === "open" && deal.specFit && deal.specFit !== "match" && party && (
          <div className="mt-8 space-y-3">
            <p className="border border-brass/40 bg-surface px-4 py-3 text-[13px] text-brass">
              {deal.specFit === "mismatch"
                ? "Спецификация противоречит заявке. Агент не торгует. Человек может снять позицию или сознательно принять предмет — тогда откроется торг."
                : "Спецификация не закрывает все условия заявки. Агент не торгует, пока человек не подтвердит предмет."}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onAcceptSpec(deal.id)}
                className="rounded-full bg-brass px-5 py-2.5 text-[13px] font-medium text-bg"
              >
                Принять предмет и торговать
              </button>
              <button
                type="button"
                onClick={() => onReject(deal.id)}
                className="rounded-full border border-line px-5 py-2.5 text-[13px] text-muted hover:text-terra"
              >
                Снять позицию
              </button>
            </div>
          </div>
        )}

        {canApprove && (
          <div className="mt-8 space-y-3">
            {verdict.ok ? (
              <p className="border border-moss/40 bg-surface px-4 py-3 text-[13px] text-moss">
                Допуск совпал: {verdict.why}. Можно утвердить вручную или оставить политике — при смене режима
                колокольчик снимет это с очереди.
              </p>
            ) : (
              <p className="border border-brass/40 bg-surface px-4 py-3 text-[13px] text-brass">
                Автопрохода нет: {verdict.why}. Колокольчик зовёт человека.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onApprove(deal.id)}
                className="rounded-full bg-brass px-5 py-2.5 text-[13px] font-medium text-bg"
              >
                Утвердить сделку
              </button>
              <button
                type="button"
                onClick={() => onReject(deal.id)}
                className="rounded-full border border-line px-5 py-2.5 text-[13px] text-muted hover:text-terra"
              >
                Отклонить
              </button>
            </div>
          </div>
        )}
        {!canApprove && canWalkAway && deal.status === "countering" && (
          <div className="mt-8 space-y-3">
            <p className="border border-brass/40 bg-surface px-4 py-3 text-[13px] text-brass">
              Пакет ещё не сошёлся. Утверждать нечего — либо агенты дожимают торг до общего комплекта, либо стороны
              расходятся.
            </p>
            <button
              type="button"
              onClick={() => onReject(deal.id)}
              className="rounded-full border border-line px-5 py-2.5 text-[13px] text-muted hover:text-terra"
            >
              Разойтись — сделка не состоялась
            </button>
          </div>
        )}
        {deal.status === "approved" && (
          <p className="mt-8 border border-moss/40 bg-surface px-4 py-3 text-[14px] text-moss">
            {deal.passedByPolicy
              ? `Сделка прошла по допуску. ${deal.policyNote ?? ""}`
              : "Сделка утверждена человеком."}{" "}
            Запущен контур исполнения: счёт, резерв партий, отгрузка.
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
          <div className="mt-8">
            <RejectCardView
              title="комната закрыта"
              card={{
                fact:
                  deal.rejectReason === "item_mismatch"
                    ? "Предмет снят: спецификация не закрыла заявку, торг не открывался."
                    : "Стороны разошлись — сделка не состоялась.",
                nextStep: "Закупщик может открыть заявку другому поставщику.",
              }}
            />
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <PartnerContextCard dossier={sellerDossier} href={`/companies/${deal.sellerId}`} />
        <PartnerContextCard dossier={buyerDossier} href={`/companies/${deal.buyerId}`} />
        <DocumentPackPreview />
        <div className="border border-line bg-surface p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Лестница цены</p>
          <div className="relative mt-6 h-2 rounded-full bg-line">
            <div
              className="absolute top-0 h-2 rounded-full bg-brass/40"
              style={{
                left: `${pct(isSeller ? deal.floorPrice : Math.min(deal.currentPrice, deal.listPrice))}%`,
                width: `${Math.max(
                  4,
                  pct(deal.listPrice) - pct(isSeller ? deal.floorPrice : Math.min(deal.currentPrice, deal.listPrice)),
                )}%`,
              }}
            />
            {isSeller ? <Mark left={pct(deal.floorPrice)} label="пол" /> : null}
            <Mark left={pct(deal.currentPrice)} label="сейчас" accent />
            <Mark left={pct(deal.listPrice)} label="лист" />
          </div>
          <dl className="mt-10 grid grid-cols-2 gap-3 text-[13px]">
            <Pair k="Лист" v={rub(deal.listPrice)} />
            <Pair k="Текущая" v={rub(deal.currentPrice)} />
            {isSeller ? <Pair k="Пол продавца" v={rub(deal.floorPrice)} /> : null}
            <Pair k="Сумма" v={compactRub(deal.currentPrice * deal.qty)} />
            <Pair k="Срок" v={days(deal.leadDays)} />
            <Pair k="Предоплата" v={`${deal.prepayPct}%`} />
            <Pair k="Поставка" v={deliveryLine(deal.incoterm, deal.destination)} />
            <Pair k="Места" v={`${deal.packCount}`} />
          </dl>
        </div>

        <div className="border border-line bg-surface p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Мандаты</p>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            <span className="text-paper">«{buyer.agent.name}».</span> {buyer.agent.mandate}
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            <span className="text-paper">«{seller.agent.name}».</span> {seller.agent.mandate}
          </p>
        </div>

        <div className="border border-line bg-surface p-5">
          <SpecSheet
            product={product}
            check={
              deal.specFit
                ? {
                    fit: deal.specFit,
                    hits: deal.specHits ?? [],
                    gaps: deal.specGaps ?? [],
                    clashes: deal.specClashes ?? [],
                  }
                : undefined
            }
          />
        </div>

        <div className="border border-line bg-surface p-5">
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
