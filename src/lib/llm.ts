import { allowedModel, DEFAULT_MODEL } from "./llm-models";
import { DEFAULT_OLLAMA_MODEL, extractJson, ollamaChat } from "./ollama";
import { timewebChat } from "./timeweb";

export { allowedModel, DEFAULT_MODEL, extractJson };

export async function agentChat(opts: {
  model: string;
  prompt: string;
  system?: string;
  timeoutMs?: number;
  json?: boolean;
}): Promise<{ text: string; model: string; channel: "timeweb" | "ollama" }> {
  const model = allowedModel(opts.model);
  try {
    const result = await timewebChat({
      model,
      prompt: opts.prompt,
      system: opts.system,
      timeoutMs: opts.timeoutMs,
    });
    return { ...result, channel: "timeweb" };
  } catch (err) {
    if (process.env.TIMEWEB_ONLY === "1") throw err;
    const text = await ollamaChat({
      ...opts,
      model: DEFAULT_OLLAMA_MODEL,
    });
    return { text, model: DEFAULT_OLLAMA_MODEL, channel: "ollama" };
  }
}
