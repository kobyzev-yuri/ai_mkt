export const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

export const DEFAULT_MODEL = "qwen2.5:14b";

export const OLLAMA_MODELS = [
  { id: "qwen2.5:14b", label: "Qwen 2.5 14B", hint: "по умолчанию, быстрее" },
  { id: "qwen2.5:7b", label: "Qwen 2.5 7B", hint: "ещё быстрее" },
  { id: "qwen3.6:27b", label: "Qwen 3.6 27B", hint: "качественнее, дольше" },
  { id: "qwen36-opus-q4km:latest", label: "Qwen 3.6 Opus", hint: "MoE 34B" },
  { id: "gemma4:26b", label: "Gemma 4 26B", hint: "альтернатива" },
  { id: "llama3.2:3b", label: "Llama 3.2 3B", hint: "черновик" },
] as const;

export function allowedModel(id: string): string {
  const t = id.trim();
  if (!t || t.length > 80 || /[\s<>]/.test(t)) return DEFAULT_MODEL;
  return t;
}

function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export function extractJson(text: string): unknown {
  const stripped = stripThink(text);
  const start = stripped.search(/[{[]/);
  const end = Math.max(stripped.lastIndexOf("}"), stripped.lastIndexOf("]"));
  if (start < 0 || end <= start) throw new Error("no json in model output");
  return JSON.parse(stripped.slice(start, end + 1));
}

export async function ollamaChat(opts: {
  model: string;
  prompt: string;
  system?: string;
  timeoutMs?: number;
  json?: boolean;
}): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 90_000);
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: allowedModel(opts.model),
        stream: false,
        format: opts.json === false ? undefined : "json",
        options: { temperature: 0.35, num_ctx: 8192 },
        messages: [
          ...(opts.system ? [{ role: "system", content: opts.system }] : []),
          { role: "user", content: opts.prompt },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ollama ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as { message?: { content?: string } };
    return data.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

export async function listOllamaModels(): Promise<string[]> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, { cache: "no-store" });
    if (!res.ok) return [...OLLAMA_MODELS.map((m) => m.id)];
    const data = (await res.json()) as { models?: { name: string }[] };
    const names = (data.models ?? []).map((m) => m.name);
    return names.length ? names : [...OLLAMA_MODELS.map((m) => m.id)];
  } catch {
    return [...OLLAMA_MODELS.map((m) => m.id)];
  }
}
