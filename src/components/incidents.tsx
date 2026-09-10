"use client";

import { Badge } from "@/components/ui";
import {
  BUYER_INCIDENT_KINDS,
  INCIDENT_LABEL,
  SELLER_INCIDENT_KINDS,
} from "@/lib/trust";
import type { Incident, IncidentKind, Order } from "@/lib/types";

const STATUS: Record<Incident["status"], string> = {
  open: "открыт",
  negotiating: "переговоры 7 дн.",
  escalated: "у площадки",
  resolved: "закрыт",
};

export function IncidentsPanel({
  order,
  companyId,
  onReport,
  onAccept,
  onEscalate,
  onPlatform,
}: {
  order: Order;
  companyId: string;
  onReport: (kind: IncidentKind) => void;
  onAccept: (id: string) => void;
  onEscalate: (id: string) => void;
  onPlatform: (id: string) => void;
}) {
  const isBuyer = companyId === order.buyerId;
  const isSeller = companyId === order.sellerId;
  const closed = order.status === "settled" || order.status === "cancelled";
  const kinds = closed ? [] : isBuyer ? BUYER_INCIDENT_KINDS : isSeller ? SELLER_INCIDENT_KINDS : [];
  const openKinds = new Set(
    (order.incidents ?? []).filter((i) => i.status !== "resolved").map((i) => i.kind),
  );
  const list = order.incidents ?? [];

  if (closed && list.length === 0) return null;

  return (
    <div className={`border bg-surface p-5 ${closed ? "border-line" : "border-terra/40"}`}>
      <p className={`font-mono text-[10px] uppercase tracking-widest ${closed ? "text-muted" : "text-terra"}`}>
        {closed ? "Архив претензий" : "Инцидент / обход"}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        {closed
          ? "Контур закрыт. Новую претензию к этому заказу открыть нельзя."
          : "Сначала агенты предлагают компенсацию. Рейтинг бьём только если стороны не сошлись и площадка решает по документам в заказе."}
      </p>

      {list.length === 0 ? (
        <p className="mt-4 text-[13px] text-muted">
          Открытых претензий нет. Если срок, оплата или приёмка сдвинулись — зафиксируйте факт.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {list.map((inc) => (
            <IncidentCard
              key={inc.id}
              incident={inc}
              party={isBuyer || isSeller}
              onAccept={() => onAccept(inc.id)}
              onEscalate={() => onEscalate(inc.id)}
              onPlatform={() => onPlatform(inc.id)}
            />
          ))}
        </ul>
      )}

      {kinds.length === 0 && (
        <p className="mt-4 font-mono text-[11px] text-muted">
          Переключите компанию на закупщика или поставщика этого заказа, чтобы принять обход или открыть претензию.
        </p>
      )}

      {kinds.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Сообщить о проблеме</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {kinds.map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={openKinds.has(kind)}
                onClick={() => onReport(kind)}
                className="rounded-full border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-paper disabled:opacity-40"
              >
                {INCIDENT_LABEL[kind]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IncidentCard({
  incident,
  party,
  onAccept,
  onEscalate,
  onPlatform,
}: {
  incident: Incident;
  party: boolean;
  onAccept: () => void;
  onEscalate: () => void;
  onPlatform: () => void;
}) {
  const done = incident.status === "resolved";
  return (
    <li className="border border-dashed border-line px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={done ? "moss" : incident.status === "escalated" ? "terra" : "brass"}>
          {INCIDENT_LABEL[incident.kind]}
        </Badge>
        <span className="font-mono text-[10px] uppercase text-muted">{STATUS[incident.status]}</span>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-paper/90">{incident.fact}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">{incident.proposed.text}</p>
      {incident.resolution && <p className="mt-2 text-[13px] text-moss">{incident.resolution}</p>}
      {party && !done && incident.status === "negotiating" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAccept}
            className="rounded-full bg-brass px-3 py-1.5 text-[12px] font-medium text-bg"
          >
            Принять обход
          </button>
          <button
            type="button"
            onClick={onEscalate}
            className="rounded-full border border-line px-3 py-1.5 text-[12px] text-paper"
          >
            Эскалировать на площадку
          </button>
        </div>
      )}
      {party && incident.status === "escalated" && (
        <button
          type="button"
          onClick={onPlatform}
          className="mt-3 rounded-full border border-terra/50 px-3 py-1.5 text-[12px] text-terra"
        >
          Решение Atrium (рейтинг)
        </button>
      )}
    </li>
  );
}
