import { ORDER_STAGES, stageIndex } from "@/lib/fulfillment";
import type { OrderStatus } from "@/lib/types";

export function Pipeline({ status, compact }: { status: OrderStatus | "approved"; compact?: boolean }) {
  const idx = status === "approved" ? 0 : stageIndex(status);
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-min gap-2">
        {ORDER_STAGES.map((s, i) => {
          const done = i < idx || status === "settled";
          const current = i === idx && status !== "settled";
          return (
            <li
              key={s.id}
              className={`w-[7.75rem] shrink-0 border px-2.5 py-2 ${
                current ? "border-brass text-brass-2" : done ? "border-moss/40 text-moss" : "border-line text-muted"
              }`}
            >
              <p className="font-mono text-[9px] uppercase tracking-widest">{String(i + 1).padStart(2, "0")}</p>
              <p className={`mt-1 leading-snug ${compact ? "text-[11px]" : "text-[12px]"}`}>{s.label}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
