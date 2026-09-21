import { ORDER_STAGES, stageIndex } from "@/lib/fulfillment";
import type { OrderStatus } from "@/lib/types";

export function Pipeline({ status, compact }: { status: OrderStatus | "approved"; compact?: boolean }) {
  const idx = status === "approved" ? 0 : stageIndex(status);
  return (
    <ol
      lang="ru"
      className={`grid min-w-0 gap-2 ${compact ? "grid-cols-4 xl:grid-cols-8" : "grid-cols-2 sm:grid-cols-4"}`}
    >
      {ORDER_STAGES.map((s, i) => {
        const done = i < idx || status === "settled";
        const current = i === idx && status !== "settled";
        return (
          <li
            key={s.id}
            className={`min-w-0 overflow-hidden border px-2 py-2 ${
              current ? "border-brass text-brass-2" : done ? "border-moss/40 text-moss" : "border-line text-muted"
            }`}
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.18em]">{String(i + 1).padStart(2, "0")}</p>
            <p
              className={`mt-1 leading-snug break-words [overflow-wrap:anywhere] ${compact ? "text-[10px]" : "text-[12px]"}`}
            >
              {s.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
