import Link from "next/link";
import { Badge } from "@/components/ui";
import type { PartnerDossier } from "@/lib/partner-context";

export function PartnerContextCard({
  dossier,
  href,
}: {
  dossier: PartnerDossier;
  href?: string;
}) {
  const title = dossier.as === "supplier" ? "Контекст поставщика" : "Контекст клиента";
  const body = (
    <>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="font-display text-xl">{dossier.other.short}</p>
        <Badge tone={dossier.caution ? "terra" : "moss"}>доверие {dossier.score}</Badge>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-paper/90">{dossier.headline}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px] text-muted">
        {dossier.as === "supplier" ? (
          <>
            <div>
              <dt>Отгрузки в срок</dt>
              <dd className="text-paper">{dossier.onTimeShipPct}%</dd>
            </div>
            <div>
              <dt>Претензии</dt>
              <dd className="text-paper">{dossier.claimRatePct}%</dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt>Оплаты в срок</dt>
              <dd className="text-paper">{dossier.onTimePayPct}%</dd>
            </div>
            <div>
              <dt>Закрытый оборот</dt>
              <dd className="text-paper">{dossier.settledCount ? `${dossier.settledCount} парт.` : "нет ещё"}</dd>
            </div>
          </>
        )}
      </dl>
      <ul className="mt-3 space-y-1 text-[12px] text-muted">
        {dossier.facts.map((f) => (
          <li key={f}>· {f}</li>
        ))}
      </ul>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="block border border-line bg-surface p-5 hover:border-brass/40">
        {body}
      </Link>
    );
  }
  return <div className="border border-line bg-surface p-5">{body}</div>;
}
