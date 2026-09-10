# Atrium на Langflow

Кабинеты закупки/поставки и движок мира остаются в Next.js. Здесь — **тот же граф ролей**.

Экран в прототипе: [http://127.0.0.1:3000/office/flow](http://127.0.0.1:3000/office/flow)

**Atrium не появляется в списке проектов слева.** Это не проект Langflow. Это:

1. поток **«Atrium · шина агентов S1–S3»** на вкладке Flows;
2. категория узлов **atrium** в палитре, когда поток уже открыт.

## Как открыть схему

Остановите текущий `langflow run` (Ctrl+C) и из корня репозитория:

```bash
conda activate py11   # или тот env, где стоит langflow
./langflow/start.sh
```

Либо вручную:

```bash
export LANGFLOW_COMPONENTS_PATH="$PWD/langflow/components"
export LANGFLOW_LOAD_FLOWS_PATH="$PWD/langflow/flows"
export LANGFLOW_LOAD_FLOWS_OVERWRITE_ON_NAME_MATCH=true
langflow run --components-path "$LANGFLOW_COMPONENTS_PATH"
```

После старта:

- слева по-прежнему **Starter Project** — это нормально;
- откройте его, на вкладке **Flows** должен быть поток **Atrium · шина агентов S1–S3**;
- если его нет: кнопка Upload → файл [`langflow/flows/Atrium.json`](flows/Atrium.json);
- откройте поток. Слева в палитре компонентов ищите **atrium** (не в списке проектов).

`python langflow/run_bus.py` только печатает `trace` в терминал. Он не ставит Langflow и не добавляет проект в сайдбар.

## Запуск флоу и связь с мордой

Langflow здесь как n8n: визуальный бэкенд. Витрина и кабинеты остаются Next.js.

В экспортированном потоке уже вшит исполняемый DAG (без петель):

```
Chat Input → Оркестратор → … → Арбитр → Qwen (Ollama qwen2.5:14b)
         → Chat Output
```

Qwen — узел категории **atrium**, тот же пин «Шина», что у арбитра. Штатный узел Models → Ollama на холст не кладём: у него пин `Message`, шина — `JSON`, провода отваливаются.

1. Остановите старый `langflow run` и снова `./langflow/start.sh` — при старте поток **Atrium · шина агентов S1–S3** перезаписывается из [`langflow/flows/Atrium.json`](flows/Atrium.json).
   Если в UI висит старый холст: закройте вкладку **без сохранения** и откройте поток заново.
2. **Playground** → напишите потребность, например про 50 000 коробок. Ответ пишет `qwen2.5:14b`; числа уже посчитала шина.
3. **Share** в шапке Langflow — готовые curl / JavaScript на `POST /api/v1/run/atrium`.
4. Морда уже зовёт это через `POST /api/langflow` (экран `/office/flow`). Кабинеты закупки от этого не зависят: сделки считает TypeScript.

```
LANGFLOW_URL=http://127.0.0.1:7860
LANGFLOW_FLOW_ID=atrium
LANGFLOW_API_KEY=   # локально часто не нужен
```

## Граф

```
Потребность → Оркестратор + Парсер → Поиск партий
                 ↓
        Агент закупки ⇄ Агент поставки
                 ↓
           Движок мандата  (числа, не LLM)
                 ↓
              Человек  →  Исполнение
                 ↓ срыв
            Инциденты → Человек | Арбитр
```

Агенты не вызывают друг друга как сервисы. Они публикуют **действие** в шину (`Data.trace`). Мандат принимает или отбрасывает числа. Ollama стоит **после** арбитра и только формулирует итог.
