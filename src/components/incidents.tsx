"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import {
  INCIDENT_LABEL,
  INCIDENT_STATUS_LABEL,
  KIND_WHEN,
  canAcceptRemedy,
  canEscalate,
  contourClosed,
  incidentRoles,
  openIncidents,
  reportableKinds,
} from "@/lib/incident-desk";
import type { Incident, IncidentKind, Order } from "@/lib/types";

export function IncidentRoom({
  order,
  companyId,
  office,
  onReport,
  onAccept,
  onEscalate,
  onPlatform,
}: {
  order: Order;
  companyId: string;
  office?: boolean;
  onReport: (kind: IncidentKind) => void;
  onAccept: (id: string) => void;
  onEscalate: (id: string) => void;
  onPlatform: (id: string) => void;
}) {
  const side = companyId === order.buyerId ? "buyer" : companyId === order.sellerId ? "seller" : null;
  const closed = contourClosed(order);
  const kinds = side && !office ? reportableKinds(order, side) : [];
  const live = openIncidents(order);
  const archive = (order.incidents ?? []).filter((i) => i.status === "resolved");

  return (
    <div className="space-y-8">
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { n: "01", who: "человек", t: "Факт", d: "Заявитель фиксирует, что сломалось. Не набор клавиш на закрытом заказе." },
          { n: "02", who: "агент", t: "Обход", d: "Агент ответственной стороны предлагает компенсацию в мандате." },
          { n: "03", who: "человек", t: "Акцепт", d: "Человек заявителя принимает обход или отклоняет его на площадку." },
          { n: "04", who: "площадка", t: "Арбитр", d: "Только после отклонения. Рейтинг бьём только здесь." },
        ].map((s) => (
          <li key={s.n} className="border border-line bg-surface px-4 py-4">
            <p className={`font-mono text-[10px] uppercase tracking-widest ${s.who === "агент" ? "text-brass" : "text-terra"}`}>
              {s.n} · {s.who}
            </p>
            <p className="mt-2 font-display text-2xl">{s.t}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.d}</p>
          </li>
        ))}
      </ol>

      {closed ? (
        <p className="border border-moss/40 bg-surface px-4 py-3 text-[14px] text-moss">
          Контур закрыт. Новую претензию открыть нельзя: согласие, оплата и приёмка уже в архиве.
        </p>
      ) : null}

      {live.length === 0 && archive.length === 0 && closed ? null : (
        <section className="space-y-4">
          {live.map((inc) => (
            <IncidentThread
              key={inc.id}
              order={order}
              incident={inc}
              companyId={companyId}
              office={Boolean(office)}
              onAccept={() => onAccept(inc.id)}
              onEscalate={() => onEscalate(inc.id)}
              onPlatform={() => onPlatform(inc.id)}
            />
          ))}
          {archive.map((inc) => (
            <IncidentThread
              key={inc.id}
              order={order}
              incident={inc}
              companyId={companyId}
              office={Boolean(office)}
              onAccept={() => onAccept(inc.id)}
              onEscalate={() => onEscalate(inc.id)}
              onPlatform={() => onPlatform(inc.id)}
            />
          ))}
        </section>
      )}

      {!closed && kinds.length > 0 ? (
        <section>
          <h2 className="font-display text-3xl">Зафиксировать факт</h2>
          <p className="mt-2 max-w-xl text-[14px] text-muted">
            Только то, что возможно на текущем шаге контура. Обход предложит агент другой стороны — не вы и не этот список.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {kinds.map((kind) => (
              <li key={kind} className="border border-line bg-surface p-4">
                <p className="font-display text-xl">{INCIDENT_LABEL[kind]}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{KIND_WHEN[kind]}</p>
                <button
                  type="button"
                  onClick={() => onReport(kind)}
                  className="mt-4 rounded-full border border-terra/50 px-4 py-2 text-[13px] text-terra hover:border-terra"
                >
                  Зафиксировать
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!closed && side && kinds.length === 0 && live.length === 0 ? (
        <p className="text-[14px] text-muted">
          На этом шаге контура новый факт не открывают. Претензия по приёмке — когда товар ждут к акту; по оплате — пока счёт не
          закрыт.
        </p>
      ) : null}

      {office && live.every((i) => i.status !== "escalated") && live.length > 0 ? (
        <p className="text-[14px] text-muted">Площадка ещё не входит: стороны в окне обхода.</p>
      ) : null}

      <p>
        <Link href={`/orders/${order.id}`} className="font-mono text-[11px] uppercase tracking-widest text-brass">
          ← К заказу
        </Link>
      </p>
    </div>
  );
}

function IncidentThread({
  order,
  incident,
  companyId,
  office,
  onAccept,
  onEscalate,
  onPlatform,
}: {
  order: Order;
  incident: Incident;
  companyId: string;
  office: boolean;
  onAccept: () => void;
  onEscalate: () => void;
  onPlatform: () => void;
}) {
  const roles = incidentRoles(incident, order);
  const done = incident.status === "resolved";
  const accept = canAcceptRemedy(order, incident, companyId);
  const escalate = canEscalate(order, incident, companyId);

  return (
    <article className="border border-terra/40 bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={done ? "moss" : incident.status === "escalated" ? "terra" : "brass"}>
          {INCIDENT_LABEL[incident.kind]}
        </Badge>
        <span className="font-mono text-[10px] uppercase text-muted">{INCIDENT_STATUS_LABEL[incident.status]}</span>
      </div>

      <ol className="mt-5 space-y-4">
        <li className="border-l-2 border-terra pl-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-terra">01 · {roles.reporter.title}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-paper">{incident.fact}</p>
          <p className="mt-1 text-[13px] text-muted">{roles.reporter.job}</p>
        </li>
        <li className="border-l-2 border-brass pl-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-brass">02 · {roles.proposer.title}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-paper">{incident.proposed.text}</p>
          <p className="mt-1 text-[13px] text-muted">{roles.proposer.job}</p>
        </li>
        <li className="border-l-2 border-terra pl-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-terra">03 · {roles.decider.title}</p>
          <p className="mt-1 text-[13px] text-muted">{roles.decider.job}</p>
          {accept ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onAccept}
                className="rounded-full bg-brass px-4 py-2 text-[13px] font-medium text-bg"
              >
                Принять обход
              </button>
              <button
                type="button"
                onClick={onEscalate}
                className="rounded-full border border-line px-4 py-2 text-[13px] text-paper hover:border-terra/50"
              >
                Отклонить → площадка
              </button>
            </div>
          ) : null}
          {escalate && !accept && incident.status === "negotiating" ? (
            <p className="mt-2 text-[13px] text-muted">
              Обход принимает {roles.decider.title}. Вы можете только передать спор площадке, если стороны не сходятся.
            </p>
          ) : null}
          {escalate && !accept && incident.status === "negotiating" ? (
            <button
              type="button"
              onClick={onEscalate}
              className="mt-3 rounded-full border border-line px-4 py-2 text-[13px] text-paper"
            >
              Эскалировать на площадку
            </button>
          ) : null}
        </li>
        <li className="border-l-2 border-line pl-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">04 · {roles.platform.title}</p>
          <p className="mt-1 text-[13px] text-muted">{roles.platform.job}</p>
          {incident.resolution ? <p className="mt-2 text-[14px] text-moss">{incident.resolution}</p> : null}
          {office && incident.status === "escalated" ? (
            <button
              type="button"
              onClick={onPlatform}
              className="mt-3 rounded-full border border-terra/50 px-4 py-2 text-[13px] text-terra"
            >
              Решение Atrium (рейтинг)
            </button>
          ) : null}
          {incident.status === "escalated" && !office ? (
            <p className="mt-2 text-[13px] text-terra">Ждёт арбитра площадки. Стороны больше не торгуют обход.</p>
          ) : null}
        </li>
      </ol>
    </article>
  );
}
