import { DOCUMENT_PACK, packStatus } from "@/lib/document-pack";
import type { Order } from "@/lib/types";

export function DocumentPack({ order }: { order: Order }) {
  const rows = packStatus(order);
  const ready = rows.filter((r) => r.present).length;
  return (
    <div className="border border-line bg-surface p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Комплект документов</p>
      <p className="mt-2 font-display text-xl">
        {ready} из {rows.length}
      </p>
      <ul className="mt-3 space-y-2 text-[13px]">
        {rows.map((row) => (
          <li key={`${row.kind}-${row.stage}`} className="flex items-start justify-between gap-3">
            <span>
              <span className={row.present ? "text-moss" : "text-muted"}>{row.present ? "●" : "○"}</span>{" "}
              <span className={row.present ? "text-paper" : "text-muted"}>{row.title}</span>
              <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-muted">{row.note}</span>
            </span>
            {row.ref ? <span className="shrink-0 font-mono text-[11px] text-muted">{row.ref}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DocumentPackPreview() {
  return (
    <div className="border border-line bg-surface p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Комплект в заказ</p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        После утверждения документы не собирают из почты. Они появляются вместе со статусом.
      </p>
      <ul className="mt-3 space-y-1 text-[13px] text-muted">
        {DOCUMENT_PACK.map((item) => (
          <li key={`${item.kind}-${item.stage}`}>
            · {item.title}{" "}
            <span className="font-mono text-[10px] uppercase tracking-wider">
              {item.stage === "agree" ? "сразу" : item.stage === "ship" ? "с отгрузкой" : "с приёмкой"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
