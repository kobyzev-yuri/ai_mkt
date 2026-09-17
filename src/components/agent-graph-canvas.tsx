"use client";

import { useMemo, useState } from "react";
import { SCENARIOS } from "@/lib/scenarios";
import {
  FLOW_EDGES,
  FLOW_LANES,
  FLOW_NODES,
  exportAgentGraph,
  nodeById,
  type FlowLane,
  type FlowScenario,
} from "@/lib/agent-graph";

const W = 1440;
const H = 560;
const NW = 188;
const NH = 92;

const LANE_TONE: Record<FlowLane, string> = {
  input: "border-line text-muted",
  platform: "border-brass/40 text-brass-2",
  party: "border-brass text-paper",
  engine: "border-moss/50 text-moss",
  gate: "border-terra/50 text-terra",
};

function pathFor(x1: number, y1: number, x2: number, y2: number, bend: number) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  if (Math.abs(x2 - x1) < 24) {
    return `M ${x1 + bend} ${y1} C ${x1 + bend} ${my}, ${x2 + bend} ${my}, ${x2 + bend} ${y2}`;
  }
  return `M ${x1} ${y1 + bend} C ${mx} ${y1 + bend}, ${mx} ${y2 + bend}, ${x2} ${y2 + bend}`;
}

function edgeBend(from: string, to: string) {
  const reverse = FLOW_EDGES.some((e) => e.from === to && e.to === from);
  if (!reverse) return 0;
  return from < to ? -28 : 28;
}

function ports(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) < NW / 2) {
    if (dy >= 0) {
      return { x1: from.x + NW / 2, y1: from.y + NH, x2: to.x + NW / 2, y2: to.y };
    }
    return { x1: from.x + NW / 2, y1: from.y, x2: to.x + NW / 2, y2: to.y + NH };
  }
  if (dx >= 0) {
    return { x1: from.x + NW, y1: from.y + NH / 2, x2: to.x, y2: to.y + NH / 2 };
  }
  return { x1: from.x, y1: from.y + NH / 2, x2: to.x + NW, y2: to.y + NH / 2 };
}

export function AgentGraphCanvas() {
  const [scenario, setScenario] = useState<FlowScenario | "all">("all");
  const [selected, setSelected] = useState<string>("buyer-agent");

  const edges = useMemo(
    () => (scenario === "all" ? FLOW_EDGES : FLOW_EDGES.filter((e) => e.scenarios.includes(scenario))),
    [scenario],
  );

  const liveIds = useMemo(() => {
    const s = new Set<string>();
    for (const e of edges) {
      s.add(e.from);
      s.add(e.to);
    }
    return s;
  }, [edges]);

  const sel = nodeById(selected);
  const incident = edges.filter((e) => e.from === selected || e.to === selected);

  function download() {
    const blob = new Blob([JSON.stringify(exportAgentGraph(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "atrium-agent-graph.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "S0", "S1", "S2", "S3"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setScenario(id)}
            className={`rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest ${
              scenario === id ? "bg-brass text-bg" : "border border-line text-muted hover:text-paper"
            }`}
          >
            {id === "all" ? "Весь контур" : `${id} ${SCENARIOS.find((s) => s.id === id)?.name ?? ""}`}
          </button>
        ))}
        <button
          type="button"
          onClick={download}
          className="ml-auto font-mono text-[11px] uppercase tracking-widest text-brass hover:text-brass-2"
        >
          Скачать граф JSON →
        </button>
      </div>
      <p className="mt-3 text-[13px] text-muted">
        Узлы — роли, рёбра — действия протокола. Модель реплик в граф не входит. Нажмите узел.
      </p>

      <div className="mt-5 overflow-x-auto border border-line bg-surface">
        <div className="relative" style={{ width: W, height: H }}>
          <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} aria-hidden>
            <defs>
              <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#c6a36a" />
              </marker>
            </defs>
            {edges.map((e) => {
              const a = nodeById(e.from);
              const b = nodeById(e.to);
              if (!a || !b) return null;
              const bend = edgeBend(e.from, e.to);
              const { x1, y1, x2, y2 } = ports(a, b);
              const hot = e.from === selected || e.to === selected;
              return (
                <g key={e.id}>
                  <path
                    d={pathFor(x1, y1, x2, y2, bend)}
                    fill="none"
                    stroke={hot ? "#c6a36a" : "#2e2a22"}
                    strokeWidth={hot ? 2 : 1.25}
                    markerEnd="url(#arr)"
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 + bend / 2 - 6}
                    textAnchor="middle"
                    className="fill-muted"
                    style={{ fontSize: 10, fontFamily: "var(--font-plex), monospace" }}
                  >
                    {e.act}
                  </text>
                </g>
              );
            })}
          </svg>
          {FLOW_NODES.map((n) => {
            const on = liveIds.has(n.id);
            const active = selected === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelected(n.id)}
                style={{ left: n.x, top: n.y, width: NW, height: NH }}
                className={`absolute border px-3 py-2 text-left transition ${LANE_TONE[n.lane]} ${
                  active ? "bg-surface-2" : on ? "bg-bg" : "bg-bg/40 opacity-40"
                }`}
              >
                <p className="font-mono text-[9px] uppercase tracking-widest">
                  {FLOW_LANES.find((l) => l.id === n.lane)?.label}
                </p>
                <p className="mt-1 font-display text-lg leading-tight">{n.label}</p>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-widest text-muted">
        {FLOW_LANES.map((l) => (
          <span key={l.id} className={LANE_TONE[l.id]}>
            {l.label}
          </span>
        ))}
      </div>

      {sel ? (
        <div className="mt-5 border border-line bg-surface p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-brass">{sel.lane}</p>
          <h3 className="mt-1 font-display text-3xl">{sel.label}</h3>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">{sel.job}</p>
          <ul className="mt-4 space-y-1 text-[13px] text-muted">
            {incident.length === 0 ? <li>Нет рёбер в выбранном сценарии.</li> : null}
            {incident.map((e) => (
              <li key={e.id}>
                <span className="font-mono text-brass">{e.act}</span>
                {" · "}
                {nodeById(e.from)?.label} → {nodeById(e.to)?.label}
                <span className="text-muted"> ({e.scenarios.join(", ")})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
