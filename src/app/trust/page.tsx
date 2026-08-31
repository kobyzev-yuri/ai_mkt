"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { companies } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { trustOf } from "@/lib/trust";

export default function TrustPage() {
  const { reputations, orders } = useStore();
  const openInc = orders.flatMap((o) => (o.incidents ?? []).filter((i) => i.status !== "resolved"));

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">SOPI / payment score</p>
      <h1 className="mt-2 font-display text-5xl">Двустороннее доверие</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
        Звёзды в каталоге мало говорят. У Alibaba — on-time delivery и abnormal fulfillment у продавца; у покупателя —
        дисциплина оплаты. Просрочка счёта бьёт не «карму», а следующие условия: выше аванс, короче отсрочка, лоты не
        снимают с резерва.
      </p>

      {openInc.length > 0 && (
        <p className="mt-6 border border-terra/40 bg-surface px-4 py-3 text-[14px]">
          Сейчас открыто инцидентов: {openInc.length}. Разберите{" "}
          <Link href={`/orders/${openInc[0].orderId}`} className="text-brass">
            заказ в исполнении
          </Link>
          .
        </p>
      )}

      <div className="mt-10 overflow-x-auto border border-line">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="bg-surface font-mono text-[10px] uppercase tracking-widest text-muted">
            <tr>
              <th className="px-4 py-3 font-normal">Компания</th>
              <th className="px-4 py-3 font-normal">Роль</th>
              <th className="px-4 py-3 font-normal">On-time отгрузка</th>
              <th className="px-4 py-3 font-normal">On-time оплата</th>
              <th className="px-4 py-3 font-normal">Претензии</th>
              <th className="px-4 py-3 font-normal">Сводный балл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {companies.map((c) => {
              const t = trustOf(c.id, reputations);
              return (
                <tr key={c.id} className="bg-bg">
                  <td className="px-4 py-3">
                    <Link href={`/companies/${c.id}`} className="text-paper hover:text-brass">
                      {c.short}
                    </Link>
                    <span className="mt-0.5 block font-mono text-[10px] text-muted">{c.city}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={c.role === "seller" ? "brass" : "default"}>
                      {c.role === "seller" ? "поставщик" : "закупщик"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono">{t.onTimeShipPct}%</td>
                  <td className="px-4 py-3 font-mono">{t.onTimePayPct}%</td>
                  <td className="px-4 py-3 font-mono">{t.claimRatePct}%</td>
                  <td className="px-4 py-3 font-display text-xl text-brass">{t.score}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="mt-14">
        <h2 className="font-display text-3xl">Как выкручиваются, когда всё ломается</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            {
              t: "Срыв отгрузки",
              d: "Trade Assurance: кредит % за день просрочки, окно претензии ~30 дней, 7 дней на договорённость сторон, потом арбитр площадки. Рейтинг on-time падает только после решения, не в момент алерта.",
            },
            {
              t: "Просрочка оплаты",
              d: "~55% B2B-счетов в США уходят за due date. Поставщик не «минусует звёзды» — поднимает предоплату, держит резерв, начисляет пеню. Медленный плательщик (у нас Волга Ритейл, 78%) сразу видит аванс 60%.",
            },
            {
              t: "Недостача / качество на воротах",
              d: "Акт + кредит-нота + довоз или замена лота. Без фото и документов платформа претензию не берёт — как на Alibaba.",
            },
            {
              t: "Призрак на складе",
              d: "28–33% B2B-заказов ломаются из-за неверного стока. Обход: дробная отгрузка или слот производства. Иначе отмена и удар по складу.",
            },
            {
              t: "УПД / ТТН",
              d: "Без закрывающих ФНС не примет вычет. Перевыпуск за сутки — не косметика, а условие закрытия контура.",
            },
            {
              t: "Форс-мажор",
              d: "Сдвигаем SLA. Рейтинг не трогаем, если справка в контуре; иначе это обычный срыв срока.",
            },
          ].map((x) => (
            <div key={x.t} className="border border-line bg-surface p-5">
              <h3 className="font-display text-2xl">{x.t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{x.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
