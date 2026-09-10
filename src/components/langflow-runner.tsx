"use client";

import { useEffect, useState } from "react";
import { DEMO_QUERY } from "@/lib/scenarios";
import type { LangflowBus } from "@/lib/langflow";

export function LangflowRunner() {
  const [query, setQuery] = useState(DEMO_QUERY);
  const [approve, setApprove] = useState(true);
  const [escalate, setEscalate] = useState(false);
  const [alive, setAlive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bus, setBus] = useState<LangflowBus | null>(null);

  useEffect(() => {
    fetch("/api/langflow")
      .then((r) => r.json())
      .then((data: { ok?: boolean }) => setAlive(Boolean(data.ok)))
      .catch(() => setAlive(false));
  }, []);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/langflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, approve, escalate }),
      });
      const data = (await res.json()) as LangflowBus & { error?: string };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setBus(data);
      setAlive(true);
    } catch (err) {
      setAlive(false);
      setError(err instanceof Error ? err.message : "не удалось вызвать Langflow");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 border border-line bg-surface p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-brass">Мост Next.js → Langflow</p>
      <h2 className="mt-2 font-display text-3xl">Прогнать шину как API</h2>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">
        Как n8n: холст крутится в Python, морда остаётся на Node. Кабинеты и сделки по-прежнему считает TypeScript.
        Этот вызов только показывает тот же протокол: <span className="font-mono text-paper">POST /api/langflow</span>{" "}
        → Langflow <span className="font-mono text-paper">/api/v1/run/atrium</span>.
      </p>
      <p className="mt-2 font-mono text-[11px] text-muted">
        {alive === null ? "проверяю Langflow…" : alive ? "Langflow на :7860 отвечает" : "Langflow не запущен"}
      </p>
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        rows={3}
        className="mt-4 w-full border border-line bg-bg px-3 py-2 text-[14px] text-paper outline-none"
      />
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px]">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={approve} onChange={(e) => setApprove(e.target.checked)} />
          Утвердить / оплатить
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={escalate} onChange={(e) => setEscalate(e.target.checked)} />
          Эскалация
        </label>
        <button
          type="button"
          onClick={run}
          disabled={busy || query.trim().length < 3}
          className="ml-auto rounded-full bg-brass px-5 py-2 text-[14px] font-medium text-bg hover:bg-brass-2 disabled:opacity-40"
        >
          {busy ? "Идёт шина…" : "Запустить флоу"}
        </button>
      </div>
      {error ? <p className="mt-4 text-[13px] text-terra">{error}. Поднимите ./langflow/start.sh и откройте поток Atrium.</p> : null}
      {bus ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <ol className="space-y-1 font-mono text-[12px] text-muted">
            {bus.trace.length === 0 ? <li>trace пуст — в Playground Langflow проверьте выход последнего узла</li> : null}
            {bus.trace.map((t, i) => (
              <li key={`${t.role}-${i}`}>
                <span className="text-brass">{String(i + 1).padStart(2, "0")}</span> {t.role} · {t.act}
              </li>
            ))}
          </ol>
          <pre className="overflow-x-auto border border-line bg-bg p-3 font-mono text-[11px] text-muted">
            {JSON.stringify({ deal: bus.deal, order: bus.order, incident: bus.incident, ruling: bus.ruling }, null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
