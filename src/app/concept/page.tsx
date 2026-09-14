import Link from "next/link";
import { AgentBus } from "@/components/agent-bus";
import { ControlExamplesTable } from "@/components/control-examples-table";
import { ProcessMap } from "@/components/process-map";
import { Badge } from "@/components/ui";
import { AGENT_ROLES, SCENARIOS, SPEECH_ACTS } from "@/lib/scenarios";

export default function ConceptPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Бэкофис · идеология</p>
      <h1 className="mt-2 max-w-3xl font-display text-5xl leading-[1.05] sm:text-6xl">
        Маркетплейс как среда взаимодействия агентов, не как каталог с ботом
      </h1>
      <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-muted">
        Atrium — цифровая среда, где агенты закупки и поставки ведут сделку как стороны. Площадка держит мир: партии,
        мандаты, документы, сроки поставки. Человек задаёт политику и подписывает деньги и товар. Агенты делают остальное.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/process" className="rounded-full bg-brass px-6 py-3 text-[14px] font-medium text-bg hover:bg-brass-2">
          Схема процессов
        </Link>
        <Link href="/office/flow" className="rounded-full border border-line px-6 py-3 text-[14px] text-paper hover:border-brass/50">
          Схема агентов
        </Link>
        <Link href="/trust" className="rounded-full border border-line px-6 py-3 text-[14px] text-paper hover:border-brass/50">
          Контроль и оценка агентов
        </Link>
      </div>

      <section className="mt-16">
        <h2 className="font-display text-4xl">Макроконтур</h2>
        <p className="mt-3 mb-8 max-w-2xl text-[15px] text-muted">
          Шаг 00 — загрузка партий из 1С. Поиск смотрит свободный остаток на витрине, не каталог как витрину магазина.
        </p>
        <ProcessMap />
      </section>

      <section className="mt-16">
        <h2 className="font-display text-4xl">Кому это нужно</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Оптовая закупка партии — это запрос предложения, торг, кратность паллеты, аванс, накладная, приёмка. Люди копируют числа между
          почтой и Excel. Среда снимает переписку и оставляет человеку три-четыре необратимых действия.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              t: "Закупщик",
              d: "Свободным текстом описывает потребность. Агент собирает комнаты, держит бюджет и срок. Человек утверждает победителя.",
            },
            {
              t: "Коммерция поставщика",
              d: "Агент отвечает на поток заявок, не продаёт ниже пола маржи и не обещает лот, которого нет.",
            },
            {
              t: "Казначейство",
              d: "Склад не едет без аванса. Оплата не в срок меняет следующие условия: выше предоплата, короче отсрочка.",
            },
            {
              t: "Склад",
              d: "Резерв партий по готовности, кратность упаковки, паспорта. Ложный остаток ловится до отгрузки.",
            },
            {
              t: "Операции площадки",
              d: "Претензия — факт в заказе, не переписка в мессенджере. Рейтинг бьём только после арбитража.",
            },
            {
              t: "Собственник контура",
              d: "Мандат как политика, журнал каждого действия, показатели агентов: пол цены, доля обходов, сколько раз нужен человек.",
            },
          ].map((x) => (
            <div key={x.t} className="border border-line bg-surface p-5">
              <h3 className="font-display text-2xl">{x.t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-4xl">Слои платформы</h2>
        <p className="mt-3 max-w-2xl text-[15px] text-muted">
          Слои не смешиваются. Оркестратор не торгуется. Агент не списывает деньги. LLM не двигает статус.
        </p>
        <ol className="mt-8 divide-y divide-line border border-line">
          {[
            ["01 Принципалы", "Мандат, утверждение, оплата, приёмка, эскалация. Единственные, кто совершает необратимое."],
            ["02 Агенты сторон", "Закупка шлёт запрос и отвечает встречным. Поставка держит пол маржи, партии, самовывоз или доставку."],
            ["03 Оркестратор", "Сценарии S1–S3: разложить задачу, назначить роли, ждать подтверждение человека или факт."],
            ["04 Движок мира", "Подбор, упаковка, пол цены, резерв партий, сроки. Детерминированные числа."],
            ["05 Языковая модель", "Разбор фразы и формулировки реплик. Нельзя сменить цену, количество, статус и число реплик."],
            ["06 Доверие", "Поставки и оплаты в срок, претензии, обход. Удар по рейтингу — только решение площадки."],
          ].map(([t, d]) => (
            <li key={t} className="grid gap-2 bg-surface px-5 py-4 sm:grid-cols-[14rem_1fr] sm:items-baseline">
              <p className="font-mono text-[12px] text-brass">{t}</p>
              <p className="text-[14px] leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-4xl">Кто на шине</h2>
        <p className="mt-3 mb-8 max-w-2xl text-[15px] text-muted">
          Роль видит свой срез мира и имеет ограниченный набор действий. Это контроль: нельзя «попросить модель закрыть
          сделку».
        </p>
        <AgentBus active={["orchestrator", "buyer-agent", "seller-agent", "mandate"]} />
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {AGENT_ROLES.map((r) => (
            <div key={r.id} className="border border-line bg-bg px-4 py-3">
              <div className="flex items-center gap-2">
                <Badge tone={r.lane === "gate" ? "terra" : r.lane === "party" ? "brass" : "default"}>
                  {r.lane === "gate" ? "подпись" : r.lane === "party" ? "сторона" : "площадка"}
                </Badge>
                <h3 className="font-display text-xl">{r.name}</h3>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{r.job}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-4xl">Сценарии, не свободный чат</h2>
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

      <section className="mt-16">
        <h2 className="font-display text-4xl">Протокол действий</h2>
        <p className="mt-3 max-w-2xl text-[15px] text-muted">
          Агенты не вызывают друг друга «как сервисы». Они публикуют действие в общий контур сделки. Движок принимает или отбрасывает.
        </p>
        <div className="mt-8 overflow-x-auto border border-line">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="bg-surface font-mono text-[10px] uppercase tracking-widest text-muted">
              <tr>
                <th className="px-4 py-3 font-normal">Действие</th>
                <th className="px-4 py-3 font-normal">Кто</th>
                <th className="px-4 py-3 font-normal">Смысл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {SPEECH_ACTS.map((a) => (
                <tr key={a.act} className="bg-bg">
                  <td className="px-4 py-3 font-mono text-brass">{a.act}</td>
                  <td className="px-4 py-3">{a.from}</td>
                  <td className="px-4 py-3 text-muted">{a.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-4xl">Примеры контроля</h2>
        <p className="mt-3 max-w-2xl text-[15px] text-muted">
          Опечатка в объёме, чужая полка, строка 1С без пола — движок режет, модель не «договаривается». Пол продавца
          закупщик не видит.
        </p>
        <div className="mt-8">
          <ControlExamplesTable />
        </div>
        <p className="mt-4 text-[13px] text-muted">
          Разбор чисел:{" "}
          <Link href="/rfq" className="text-brass">
            /rfq
          </Link>{" "}
          (арматура 12 / 2 / 120 т) ·{" "}
          <Link href="/sell/adapter" className="text-brass">
            /sell/adapter
          </Link>{" "}
          (SP-XXX) · полный текст{" "}
          <span className="font-mono text-paper">docs/BUSINESS.md</span> § 4.1.
        </p>
      </section>

      <section className="mt-16 border border-brass/30 bg-surface p-6">
        <h2 className="font-display text-3xl">Безопасность коротко</h2>
        <ul className="mt-4 grid gap-3 text-[14px] leading-relaxed text-muted md:grid-cols-2">
          <li>Мандат — жёсткий пол, не подсказка модели.</li>
          <li>Языковая модель не меняет цену, количество и статус сделки.</li>
          <li>Деньги и товар — только подтверждение человека.</li>
          <li>Рейтинг не падает в момент сигнала, только после арбитража.</li>
          <li>Каждое действие пишется в журнал контроля.</li>
          <li>Претензия без документов в заказе не защищена.</li>
        </ul>
        <p className="mt-6 text-[13px] text-muted">
          Полный текст: <span className="font-mono text-paper">docs/CONCEPT.md</span> и схема агентов на{" "}
          <Link href="/office/flow" className="text-brass">
            /office/flow
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
