import { homedir } from "node:os";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { allowedModel, DEFAULT_MODEL, TIMEWEB_MODELS } from "./llm-models";

const MODEL_ALIASES = [
  "zai/glm-4.7-flashx",
  "glm-4.7-flashx",
  "openai/gpt-5.6-luna",
];

const DEFAULT_BASE = "https://api.timeweb.ai/v1";
const SKIP_MODEL = /embedding|tts|transcribe|whisper|image|flux|dall/i;
const CHEAP_FIRST = [
  /glm-4\.7-flashx/i,
  /gpt-5\.6-luna/i,
];

type TimewebCreds = { base: string; key: string };

let listed: { at: number; ids: string[] } | null = null;

function loadCreds(): TimewebCreds | null {
  const envKey = process.env.TIMEWEB_API_KEY?.trim() || process.env.TIMEWEB_AI_TOKEN?.trim();
  const envBase = (process.env.TIMEWEB_BASE_URL ?? process.env.TIMEWEB_API_BASE ?? "").trim();
  if (envKey) {
    return { base: (envBase || DEFAULT_BASE).replace(/\/$/, ""), key: envKey };
  }
  const path = process.env.TIMEWEB_KEY_FILE?.trim() || join(homedir(), "keys", "tw_sandkrit.txt");
  try {
    const lines = readFileSync(/* turbopackIgnore: true */ path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length >= 2) {
      return { base: lines[0].replace(/\/$/, ""), key: lines[1] };
    }
  } catch {
    /* no key file */
  }
  return null;
}

export function timewebConfigured(): boolean {
  return loadCreds() !== null;
}

function chatModels(ids: string[]): string[] {
  return ids.filter((id) => id && !SKIP_MODEL.test(id));
}

function matchLive(wanted: string, live: string[]): string | undefined {
  if (live.includes(wanted)) return wanted;
  const tail = wanted.split("/").pop()?.toLowerCase();
  if (!tail) return undefined;
  return live.find((id) => id.toLowerCase() === tail || id.toLowerCase().endsWith(`/${tail}`));
}

export function pickCheapTimewebId(live: string[]): string {
  const chat = chatModels(live);
  for (const re of CHEAP_FIRST) {
    const hit = chat.find((id) => re.test(id));
    if (hit) return hit;
  }
  return matchLive(DEFAULT_MODEL, chat) ?? chat[0] ?? DEFAULT_MODEL;
}

export async function listTimewebModels(): Promise<string[]> {
  const creds = loadCreds();
  if (!creds) return [];
  if (listed && Date.now() - listed.at < 5 * 60_000) return listed.ids;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8_000);
  try {
    const res = await fetch(`${creds.base}/models`, {
      headers: { Authorization: `Bearer ${creds.key}`, Accept: "application/json" },
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: { id?: string }[] };
    const ids = chatModels((data.data ?? []).map((m) => m.id ?? "").filter(Boolean));
    listed = { at: Date.now(), ids };
    return ids;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function resolveModel(requested: string): Promise<string> {
  const live = await listTimewebModels();
  if (live.length === 0) return requested;
  return matchLive(requested, live) ?? pickCheapTimewebId(live);
}

function textFromMessage(message: { content?: unknown } | undefined): string {
  const content = message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String((part as { text?: string }).text ?? "");
        return "";
      })
      .join("");
  }
  return "";
}

function extraBody(model: string): Record<string, unknown> {
  if (/qwen|dashscope/i.test(model)) return { enable_thinking: false };
  if (/glm|zai/i.test(model)) return { thinking: { type: "disabled" } };
  if (/gpt|openai/i.test(model)) return { reasoning_effort: "minimal" };
  return {};
}

export async function timewebChat(opts: {
  model: string;
  prompt: string;
  system?: string;
  timeoutMs?: number;
}): Promise<{ text: string; model: string }> {
  const creds = loadCreds();
  if (!creds) throw new Error("timeweb: no api key");
  const resolved = await resolveModel(allowedModel(opts.model));
  const candidates = [...new Set([resolved, ...MODEL_ALIASES, ...TIMEWEB_MODELS.map((m) => m.id)])];
  const perTry = Math.min(18_000, opts.timeoutMs ?? 18_000);
  let lastError = "timeweb: no model";
  for (const model of candidates) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), perTry);
    try {
      const res = await fetch(`${creds.base}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.key}`,
          "Content-Type": "application/json",
        },
        signal: ctrl.signal,
        body: JSON.stringify({
          model,
          stream: false,
          temperature: 0.35,
          ...extraBody(model),
          messages: [
            ...(opts.system ? [{ role: "system", content: opts.system }] : []),
            { role: "user", content: opts.prompt },
          ],
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        lastError = `timeweb ${res.status}: ${body.slice(0, 200)}`;
        if (res.status === 400 || res.status === 404 || res.status === 422) continue;
        throw new Error(lastError);
      }
      const data = (await res.json()) as {
        model?: string;
        choices?: { message?: { content?: unknown } }[];
      };
      const text = textFromMessage(data.choices?.[0]?.message);
      if (!text.trim()) {
        lastError = "timeweb: empty completion";
        continue;
      }
      return { text, model: data.model || model };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "timeweb: fetch failed";
      if (/timeweb 401|timeweb 403/.test(lastError)) throw err instanceof Error ? err : new Error(lastError);
      continue;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(lastError);
}

export function timewebPicker(live: string[]): { id: string; label: string; hint: string }[] {
  if (live.length === 0) {
    return TIMEWEB_MODELS.map((m) => ({ id: m.id, label: m.label, hint: m.hint }));
  }
  const ids = [...new Set([pickCheapTimewebId(live), ...TIMEWEB_MODELS.map((m) => matchLive(m.id, live)).filter((id): id is string => Boolean(id))])];
  return ids.slice(0, 5).map((id) => {
    const known = TIMEWEB_MODELS.find((m) => m.id === id || matchLive(m.id, [id]));
    const tail = id.split("/").pop() ?? id;
    return {
      id,
      label: known?.label ?? tail.replace(/-/g, " "),
      hint: known?.hint ?? "Timeweb",
    };
  });
}
