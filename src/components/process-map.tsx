import { PROCESS_INCIDENT, PROCESS_LANE, PROCESS_STEPS } from "@/lib/process";

export function ProcessMap() {
  return (
    <div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PROCESS_STEPS.map((s) => (
          <li key={s.id} className="min-w-0 border border-line bg-surface p-4">
            <p className="font-mono text-[11px] text-brass">
              {s.n} · {PROCESS_LANE[s.lane]}
            </p>
            <h3 className="mt-2 font-display text-xl leading-snug break-words [overflow-wrap:anywhere]">
              {s.title}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
      <div className="mt-3 border border-dashed border-terra/50 bg-surface p-4">
        <p className="font-mono text-[11px] text-terra">S3 · не ломает цепочку</p>
        <h3 className="mt-2 font-display text-2xl">{PROCESS_INCIDENT.title}</h3>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted">{PROCESS_INCIDENT.text}</p>
      </div>
    </div>
  );
}
