import { AGENT_ROLES, type AgentRoleId } from "@/lib/scenarios";

export function AgentBus({ active }: { active: AgentRoleId[] }) {
  const on = new Set(active);
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {AGENT_ROLES.map((r) => {
        const live = on.has(r.id);
        const human = r.lane === "gate";
        const liveBox = human
          ? "border-terra bg-surface-2 text-paper"
          : "border-brass bg-surface-2 text-paper";
        return (
          <li key={r.id} className={`border px-2.5 py-2 ${live ? liveBox : "border-line text-muted"}`}>
            <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest">
              {live ? (
                <span className={`live-dot h-1.5 w-1.5 rounded-full ${human ? "bg-terra" : "bg-brass"}`} />
              ) : null}
              {human ? "человек" : r.lane === "party" ? "агент стороны" : "агент площадки"}
            </p>
            <p className={`mt-1 text-[12px] ${live ? (human ? "text-terra" : "text-brass-2") : ""}`}>{r.name}</p>
          </li>
        );
      })}
    </ul>
  );
}
