import Link from "next/link";
import { Badge } from "@/components/ui";
import { companyById, productById } from "@/lib/agents";
import { compactRub, days, dealStatusLabel, deliveryLine, rub } from "@/lib/format";
import { partnerDossier } from "@/lib/partner-context";
import { autoPassVerdict } from "@/lib/policy";
import type { Deal, Order, TradePolicy, TrustScore } from "@/lib/types";

export function OfferCompare({
  deals,
  orders = [],
  reputations,
  policies,
  viewerId,
}: {
  deals: Deal[];
  orders?: Order[];
  reputations?: Record<string, TrustScore>;
  policies?: Record<string, TradePolicy>;
  viewerId?: string;
}) {
  if (deals.length === 0) return null;
  const sorted = [...deals].sort((a, b) => b.score - a.score);
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[860px] text-left text-[13px]">
        <thead className="bg-surface font-mono text-[10px] uppercase tracking-widest text-muted">
          <tr>
            <th className="px-4 py-3 font-normal">Поставщик</th>
            <th className="px-4 py-3 font-normal">Надёжность</th>
            <th className="px-4 py-3 font-normal">Цена</th>
            <th className="px-4 py-3 font-normal">Срок</th>
            <th className="px-4 py-3 font-normal">Предоплата</th>
            <th className="px-4 py-3 font-normal">Поставка</th>
            <th className="px-4 py-3 font-normal">Статус</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sorted.map((d) => {
            const seller = companyById(d.sellerId);
            const product = productById(d.productId);
            const dossier = partnerDossier(d.buyerId, d.sellerId, deals, orders, reputations);
            const verdict = autoPassVerdict(d, orders, reputations, policies);
            return (
              <tr key={d.id} className="bg-bg">
                <td className="px-4 py-3">
                  <Link href={`/deals/${d.id}`} className="text-paper hover:text-brass-2">
                    {seller.short}
                  </Link>
                  <p className="mt-0.5 text-[12px] text-muted">{product.name}</p>
                </td>
                <td className="px-4 py-3">
                  <p className={dossier.caution ? "text-terra" : "text-moss"}>
                    {dossier.score} · отгрузки {dossier.onTimeShipPct}%
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    {verdict.ok ? "допуск" : viewerId ? "нужен человек" : dossier.headline}
                  </p>
                </td>
                <td className="px-4 py-3 font-mono text-brass">
                  {rub(d.currentPrice)}
                  <span className="mt-0.5 block text-[11px] text-muted">{compactRub(d.currentPrice * d.qty)}</span>
                </td>
                <td className="px-4 py-3">{days(d.leadDays)}</td>
                <td className="px-4 py-3">{d.prepayPct}%</td>
                <td className="px-4 py-3 text-muted">{deliveryLine(d.incoterm, d.destination)}</td>
                <td className="px-4 py-3">
                  <Badge
                    tone={
                      d.status === "agreed" || d.status === "approved"
                        ? "moss"
                        : d.status === "rejected"
                          ? "terra"
                          : "live"
                    }
                  >
                    {d.passedByPolicy ? "по допуску" : dealStatusLabel(d.status)}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
