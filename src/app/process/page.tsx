import { ProcessMap } from "@/components/process-map";
import { SCENARIOS } from "@/lib/scenarios";

export default function ProcessPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Бэкофис · процессы</p>
      <h1 className="mt-2 max-w-3xl font-display text-5xl leading-tight">От выгрузки 1С до закрытого заказа</h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
        Документация контура для оператора площадки. Сначала поставщик кладёт партии на витрину. Потом поиск, мандат,
        подпись человека. Живой прогон: <span className="font-mono text-paper">./start-demo.sh</span> →{" "}
        <a href="http://127.0.0.1:3001/demo" className="font-mono text-brass">
          http://127.0.0.1:3001/demo
        </a>
        , не кабинет на порту 3000.
      </p>

      <section className="mt-14">
        <h2 className="font-display text-4xl">Макроконтур</h2>
        <p className="mt-3 max-w-2xl text-[15px] text-muted">
          Шаг 00 — загрузка товаров. Без него поиск смотрит пустую витрину.
        </p>
        <div className="mt-8">
          <ProcessMap />
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-4xl">Сценарии на шине</h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {SCENARIOS.map((s) => (
            <div key={s.id} className="border border-line bg-surface p-5">
              <p className="font-mono text-[11px] text-brass">{s.id}</p>
              <h3 className="mt-2 font-display text-3xl">{s.name}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.blurb}</p>
              <ol className="mt-4 space-y-2">
                {s.steps.map((st, i) => (
                  <li key={st.id} className="text-[13px]">
                    <span className="font-mono text-[11px] text-brass">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-paper"> {st.title}</span>
                    {st.human ? <span className="text-muted"> · человек</span> : null}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
