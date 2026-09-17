import { Badge } from "@/components/ui";
import type { PartnerMemo } from "@/lib/partner-memo";

export function PartnerMemoCard({ memo, name }: { memo: PartnerMemo; name: string }) {
  return (
    <div className="border border-line bg-surface p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-brass">Памятка по контрагенту</p>
      <p className="mt-2 font-display text-xl">{name}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">{memo.line}</p>
      <div className="mt-3">
        <Badge tone={memo.next.id === "call" ? "terra" : "brass"}>{memo.next.label}</Badge>
      </div>
    </div>
  );
}
