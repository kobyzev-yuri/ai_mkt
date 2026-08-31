import { ORDER_STAGES, stageIndex } from "@/lib/fulfillment";
import type { OrderStatus } from "@/lib/types";

export function Pipeline({ status, compact }: { status: OrderStatus | "approved"; compact?: boolean }) {
  const idx = status === "approved" ? 0 : stageIndex(status);
  return (
    <ol className={`grid gap-2 ${compact ? "grid-cols-4 lg:grid-cols-8" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8"}`}>
      {ORDER_STAGES.map((s, i) => {
        const done = i < idx || status === "settled";
        const current = i === idx && status !== "settled";
        return (
          <li
            key={s.id}
            className={`border px-2 py-2 ${current ? "border-brass text-brass-2" : done ? "border-moss/40 text-moss" : "border-line text-muted"}`}
          >
            <p className="font-mono text-[9px] uppercase tracking-widest">{String(i + 1).padStart(2, "0")}</p>
            <p className={`mt-1 ${compact ? "text-[11px]" : "text-[12px]"}`}>{s.label}</p>
          </li>
        );
      })}
    </ol>
  );
}
