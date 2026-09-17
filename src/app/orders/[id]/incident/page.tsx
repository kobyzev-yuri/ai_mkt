"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { IncidentRoom } from "@/components/incidents";
import { companyById, productById } from "@/lib/agents";
import { compactRub, orderStatusLabel } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui";

export default function OrderIncidentPage() {
  const { id } = useParams<{ id: string }>();
  const { account } = useSession();
  const { orders, company, reportIncident, acceptIncidentRemedy, escalateOrderIncident, resolveOnPlatform } = useStore();
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

  const product = productById(order.productId);
  const buyer = companyById(order.buyerId);
  const seller = companyById(order.sellerId);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-terra">Комната претензии</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Badge tone={order.status === "settled" ? "moss" : "live"}>{orderStatusLabel(order.status)}</Badge>
        <span className="font-mono text-[11px] text-muted">
          {buyer.short} ↔ {seller.short}
        </span>
      </div>
      <h1 className="mt-3 font-display text-4xl leading-tight">{product.name}</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
        Отдельный контур от торга. Здесь не листают «срыв / недостача / УПД» как клавиши на закрытой сделке. Факт → обход
        агента → акцепт человека → при отказе арбитр площадки. {compactRub(order.total)}.
      </p>

      <div className="mt-10">
        <IncidentRoom
          order={order}
          companyId={company.id}
          office={account?.desk === "office"}
          onReport={(kind) => reportIncident(order.id, kind)}
          onAccept={(incId) => acceptIncidentRemedy(order.id, incId)}
          onEscalate={(incId) => escalateOrderIncident(order.id, incId)}
          onPlatform={(incId) => resolveOnPlatform(order.id, incId)}
        />
      </div>
    </div>
  );
}
