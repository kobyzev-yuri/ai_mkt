/** Optional Langflow bus. Marketplace deals stay in the TypeScript engine. */

export const LANGFLOW_URL = process.env.LANGFLOW_URL ?? "http://127.0.0.1:7860";
export const LANGFLOW_FLOW = process.env.LANGFLOW_FLOW_ID ?? "atrium";

export interface LangflowBus {
  trace: { role: string; act: string }[];
  deal: Record<string, unknown> | null;
  order: Record<string, unknown> | null;
  incident: Record<string, unknown> | null;
  ruling: Record<string, unknown> | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function walk(value: unknown, found: Record<string, unknown>[]): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, found);
    return;
  }
  const rec = asRecord(value);
  if (!rec) return;
  if (Array.isArray(rec.trace) || rec.deal || rec.order) found.push(rec);
  for (const next of Object.values(rec)) {
    if (next && typeof next === "object") walk(next, found);
  }
}

export function parseLangflowBus(payload: unknown): LangflowBus {
  const found: Record<string, unknown>[] = [];
  walk(payload, found);
  const best = [...found].reverse().find((r) => Array.isArray(r.trace)) ?? found.at(-1) ?? {};
  const trace = Array.isArray(best.trace)
    ? best.trace.filter((t): t is { role: string; act: string } => {
        const row = asRecord(t);
        return Boolean(row && typeof row.role === "string" && typeof row.act === "string");
      })
    : [];
  return {
    trace,
    deal: asRecord(best.deal),
    order: asRecord(best.order),
    incident: asRecord(best.incident),
    ruling: asRecord(best.ruling),
  };
}

export async function pingLangflow(): Promise<boolean> {
  try {
    const res = await fetch(`${LANGFLOW_URL}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function runLangflowBus(opts: {
  query: string;
  approve?: boolean;
  escalate?: boolean;
}): Promise<LangflowBus> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = process.env.LANGFLOW_API_KEY;
  if (key) headers["x-api-key"] = key;

  const res = await fetch(`${LANGFLOW_URL}/api/v1/run/${encodeURIComponent(LANGFLOW_FLOW)}`, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify({
      input_value: opts.query,
      input_type: "text",
      output_type: "any",
      tweaks: {
        atrium_orchestrator: { need_text: opts.query },
        atrium_parser: { need_text: opts.query },
        atrium_human: { approve: opts.approve ?? true },
        atrium_platform: { escalate: opts.escalate ?? false },
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text.slice(0, 400) || `Langflow ${res.status}`);
  }
  return parseLangflowBus(JSON.parse(text) as unknown);
}
