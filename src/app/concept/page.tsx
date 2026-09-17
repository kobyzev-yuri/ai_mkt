import Link from "next/link";
import { AgentBus } from "@/components/agent-bus";
import { IdeaStub } from "@/components/idea-stub";
import { Badge } from "@/components/ui";
import { AGENT_ROLES, SCENARIOS, SPEECH_ACTS } from "@/lib/scenarios";
import { STUBS } from "@/lib/stubs";

export default function ConceptPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Бэкофис · идеология</p>
      <h1 className="mt-2 max-w-3xl font-display text-5xl leading-[1.05] sm:text-6xl">
        Маркетплейс как среда взаимодействия агентов, не как каталог с ботом
      </h1>
      <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-muted">
        Atrium — цифровая среда, где агенты закупки и поставки ведут сделку как стороны. Площадка держит мир: партии,
        мандаты, документы, сроки поставки. Человек задаёт политику — от пошагового контроля до автопилота в мандате —
        и подписывает деньги и товар. Агенты делают остальное.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/demo" className="rounded-full bg-brass px-6 py-3 text-[14px] font-medium text-bg hover:bg-brass-2">
          Смотреть прогон сделки
        </Link>
        <Link href="/sell" className="rounded-full border border-line px-6 py-3 text-[14px] text-paper hover:border-brass/50">
          Кабинет поставщика
        </Link>
        <Link href="/trust" className="rounded-full border border-line px-6 py-3 text-[14px] text-paper hover:border-brass/50">
          Контроль и оценка агентов
        </Link>
      </div>

      <section className="mt-16">
        <h2 className="font-display text-4xl">Кому это нужно</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Оптовая закупка партии — это запрос предложения, торг, кратность паллеты, аванс, накладная, приёмка. Люди копируют числа между
          почтой и Excel. Среда снимает переписку. Человек входит, когда допуск не сработал или нужны деньги и товар.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              t: "Закупщик",
              d: "Свободным текстом описывает потребность. До торга видит надёжность поставщика и комплект документов. Утверждает или пускает по допуску.",
            },
            {
              t: "Коммерция поставщика",
              d: "Входящие лиды, не витрина площадки. До ответа видит оплаты клиента. Агент не продаёт ниже пола. Крупные и спорные — колокольчик.",
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
        <h2 className="font-display text-4xl">Живое ядро и заглушки</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Сделка живая: заявка, досье до торга, торг в мандате, допуск или подпись, резерв, комплект, обход. Каналы, которых нет, подписаны
          «заглушка» — идея для поставщика, не притворный API.
        </p>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <IdeaStub stub={STUBS.messenger} />
          <IdeaStub stub={STUBS.onec} />
          <IdeaStub stub={STUBS.edo} />
          <IdeaStub stub={STUBS.egrul} />
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-4xl">Слои платформы</h2>
        <p className="mt-3 max-w-2xl text-[15px] text-muted">
          Слои не смешиваются. Оркестратор не торгуется. Агент не списывает деньги. LLM не двигает статус.
        </p>
        <ol className="mt-8 divide-y divide-line border border-line">
          {[
            ["01 Принципалы", "Мандат и политика (пошагово / допуски / автопилот), оплата, приёмка, эскалация. Необратимое — человек, кроме утверждения по допуску."],
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
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
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
        <h2 className="font-display text-4xl">Протоколы взаимодействия</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Условия контура для участника, не для разработчика. Полный текст —{" "}
          <span className="font-mono text-paper">docs/GUIDE.md</span>. Политику меняют в кабинете закупки или поставки.
        </p>

        <h3 className="mt-10 font-display text-2xl">До торговли</h3>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">
          Комнату нельзя открывать вслепую. Сравнение КП и карточка сделки показывают досье до утверждения.
        </p>
        <div className="mt-6 overflow-x-auto border border-line">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="bg-surface font-mono text-[10px] uppercase tracking-widest text-muted">
              <tr>
                <th className="px-4 py-3 font-normal">Что</th>
                <th className="px-4 py-3 font-normal">Закупщик про поставщика</th>
                <th className="px-4 py-3 font-normal">Поставщик про клиента</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-bg text-muted">
              <tr>
                <td className="px-4 py-3 text-paper">Надёжность</td>
                <td className="px-4 py-3">отгрузки в срок, претензии, срывы, балл доверия</td>
                <td className="px-4 py-3">оплаты в срок, закрытый оборот</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-paper">Риск</td>
                <td className="px-4 py-3">открытый спор с этой организацией</td>
                <td className="px-4 py-3">спор; оплаты ниже порога — выше аванс дальше</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-paper">Комплект</td>
                <td className="px-4 py-3" colSpan={2}>
                  спецификация, счёт аванса, паспорт партии, ТТН, УПД, акт, счёт остатка — чеклист заказа, не почта
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="mt-10 font-display text-2xl">Политика: штатный режим и выбор человека</h3>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {[
            {
              t: "Критические моменты",
              d: "По умолчанию, как раньше. Агент только торгуется. Человек входит при крупной сумме, слабом доверии или споре. Деньги и приёмка всегда ваши.",
            },
            {
              t: "Каждая сделка — подпись",
              d: "Для важной партии или нового контрагента: каждое согласие ждёт вашу подпись. Агент не выходит за мандат.",
            },
            {
              t: "Автопилот в мандате",
              d: "Для знакомой истории: если доверие не ниже порога и нет спора, сделка проходит без вас. Деньги и приёмка остаются за человеком.",
            },
          ].map((x) => (
            <div key={x.t} className="border border-line bg-surface p-5">
              <h4 className="font-display text-xl">{x.t}</h4>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{x.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-muted">
          Автопроход есть, только если сошлись обе политики: закупщик пускает поставщика по надёжности, поставщик пускает
          клиента по оплатам в срок, нет открытого спора. Иначе колокольчик в шапке.
        </p>

        <h3 className="mt-10 font-display text-2xl">Когда зовут человека</h3>
        <ul className="mt-4 grid gap-3 text-[14px] leading-relaxed text-muted md:grid-cols-2">
          <li>Согласованная сделка вне допуска — нужна подпись.</li>
          <li>Лид выше суммы допуска или слабые оплаты клиента.</li>
          <li>Аванс не проведён — без оплаты склад не едет.</li>
          <li>Приёмка, остаток, открытый спор или эскалация.</li>
        </ul>
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

      <section className="mt-16 border border-brass/30 bg-surface p-6">
        <h2 className="font-display text-3xl">Безопасность коротко</h2>
        <ul className="mt-4 grid gap-3 text-[14px] leading-relaxed text-muted md:grid-cols-2">
          <li>Мандат — жёсткий пол, не подсказка модели.</li>
          <li>Языковая модель не меняет цену, количество и статус сделки.</li>
          <li>Политику торговли задаёт участник: пошагово, допуски или автопилот.</li>
          <li>Деньги и товар — только подтверждение человека. Сделку может пропустить допуск.</li>
          <li>Рейтинг не падает в момент сигнала, только после арбитража.</li>
          <li>Претензия без документов в заказе не защищена.</li>
        </ul>
        <p className="mt-6 max-w-2xl text-[14px] leading-relaxed text-muted">
          Нагрузка одной фразой: числа и мандат считаются сразу; голос модели и каналы (когда появятся живые
          организации) — в очередь. До этого прототип — один контур в браузере, не микросервисы.
        </p>
        <p className="mt-6 text-[13px] text-muted">
          Полный текст: <span className="font-mono text-paper">docs/GUIDE.md</span> (протоколы),{" "}
          <span className="font-mono text-paper">docs/CONCEPT.md</span> (среда), процессы в{" "}
          <span className="font-mono text-paper">docs/BUSINESS.md</span>.
        </p>
      </section>
    </div>
  );
}
