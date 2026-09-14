"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { num, qty, rub } from "@/lib/format";
import { ADAPTER_MAP, DEMO_1C_CSV, SKIP_OWNER_LABEL, adapt1CRows, parse1CCsv } from "@/lib/lot-adapter";
import { SELLER_ID, companies } from "@/lib/seed";
import { useStore } from "@/lib/store";

export default function SellAdapterPage() {
  const { importAdaptedLots, lots, company } = useStore();
  const [csv, setCsv] = useState(DEMO_1C_CSV);
  const [done, setDone] = useState(0);

  const seller = companies.find((c) => c.id === SELLER_ID)!;
  const parsed = useMemo(() => parse1CCsv(csv), [csv]);
  const { ok, skipped } = useMemo(() => adapt1CRows(parsed, SELLER_ID), [parsed]);
  const live = lots.filter((l) => l.id.startsWith("lot-adapt-")).length;

  function apply() {
    importAdaptedLots(ok.map((x) => x.lot));
    setDone(ok.length);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Поставки · интегратор</p>
      <h1 className="mt-2 font-display text-5xl leading-tight">Адаптер склада</h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
        Пример, не продукт. {seller.name} выгрузил остатки из 1С. Коннектор и маппинг — работа интегратора. Площадка
        принимает только канон партии: SKU уже есть, есть пол, остаток кратен паллете. Услуги и строки без пола
        отбрасываются. Витрина, счёт и резерв не меняются, пока не нажмёте «Выложить».
      </p>
      <p className="mt-3 text-[13px] text-muted">
        После приёма лоты появляются в{" "}
        <Link href="/sell/catalog" className="text-brass">
          витрине партий
        </Link>
        {live ? ` · сейчас с адаптера: ${live}` : null}.
      </p>
      {company.id !== SELLER_ID ? (
        <p className="mt-3 border border-brass/40 bg-surface px-4 py-3 text-[13px] text-muted">
          Партии лягут на {seller.short}. Активная организация ({company.short}) не меняется.
        </p>
      ) : null}

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {ADAPTER_MAP.slice(0, 3).map((m) => (
          <div key={m.theirs} className="border border-line bg-surface px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{m.theirs}</p>
            <p className="mt-2 font-display text-2xl">{m.ours}</p>
            <p className="mt-1 text-[12px] text-muted">{m.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <p className="font-mono text-[11px] uppercase tracking-widest text-brass">Их выгрузка</p>
          <h2 className="mt-1 font-display text-3xl">1С · ОстаткиСкладов</h2>
          <textarea
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setDone(0);
            }}
            rows={12}
            spellCheck={false}
            className="mt-4 w-full border border-line bg-bg px-3 py-2 font-mono text-[11px] leading-relaxed text-paper outline-none"
          />
        </section>

        <section>
          <p className="font-mono text-[11px] uppercase tracking-widest text-brass">Канон площадки</p>
          <h2 className="mt-1 font-display text-3xl">
            {ok.length} партий · {skipped.length} отказ
          </h2>
          <p className="mt-2 text-[13px] text-muted">Приму / не приму — как страховка разбора у закупки. Без кнопки витрина не меняется.</p>
          <ul className="mt-4 space-y-3">
            {ok.map((item) => (
              <li key={item.lot.id} className="border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="moss">принять</Badge>
                  <span className="font-mono text-[11px] text-muted">{item.row.sku}</span>
                </div>
                <p className="mt-2 text-[15px]">{item.productName}</p>
                <p className="mt-1 text-[13px] text-muted">
                  {qty(item.lot.qty, item.lot.unit)} · {item.lot.warehouse} · {item.lot.readyDays === 0 ? "со склада" : `${item.lot.readyDays} дн.`} · кратность {item.packNote}
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  пол {item.row.floor != null ? rub(item.row.floor) : "—"} · их цена{" "}
                  {item.row.price != null ? rub(item.row.price) : "—"} · партия {item.lot.batchNo}
                </p>
              </li>
            ))}
            {skipped.map((item) => (
              <li key={`${item.row.code}-${item.issues.map((i) => i.code).join("-")}`} className="border border-terra/30 bg-bg p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="terra">отсев</Badge>
                  <span className="font-mono text-[11px] text-muted">{item.row.sku || item.row.code}</span>
                </div>
                <p className="mt-2 text-[15px]">{item.row.name}</p>
                <ul className="mt-3 space-y-2">
                  {item.issues.map((issue) => (
                    <li key={issue.code} className="border border-line/70 px-3 py-2">
                      <p className="text-[13px] text-terra">{issue.fact}</p>
                      <p className="mt-1 text-[12px] text-muted">Что сделать: {issue.fix}</p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-brass">
                        Кто: {SKIP_OWNER_LABEL[issue.owner]}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={apply}
            disabled={!ok.length}
            className="mt-5 rounded-full bg-brass px-5 py-2 text-[14px] font-medium text-bg hover:bg-brass-2 disabled:opacity-40"
          >
            {done ? `Выложено ${num(done)}` : "Выложить партии на площадку"}
          </button>
        </section>
      </div>
    </div>
  );
}
