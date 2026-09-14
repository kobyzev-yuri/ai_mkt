import { Badge } from "@/components/ui";
import type { RejectCard } from "@/lib/types";

export function RejectCardView({ card, title }: { card: RejectCard; title?: string }) {
  return (
    <div className="border border-terra/30 bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="terra">отказ</Badge>
        {title ? <span className="font-mono text-[11px] text-muted">{title}</span> : null}
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-paper">{card.fact}</p>
      <p className="mt-2 text-[13px] text-brass">Что дальше: {card.nextStep}</p>
    </div>
  );
}
