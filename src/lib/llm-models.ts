export const DEFAULT_MODEL = "zai/glm-4.7-flashx";

export const TIMEWEB_MODELS = [
  { id: "zai/glm-4.7-flashx", label: "GLM 4.7 FlashX", hint: "Timeweb · 9 ₽/млн" },
  { id: "openai/gpt-5.6-luna", label: "GPT-5.6 Luna", hint: "Timeweb · 27 ₽/млн" },
] as const;

export function allowedModel(id: string): string {
  const t = id.trim();
  if (!t || t.length > 120 || /[\s<>]/.test(t)) return DEFAULT_MODEL;
  return t;
}

export function isLocalOllamaId(id: string): boolean {
  return id.includes(":") && !id.includes("/");
}

export function migrateLlmModel(id?: string): string {
  if (!id || isLocalOllamaId(id)) return DEFAULT_MODEL;
  if (/qwen/i.test(id)) return DEFAULT_MODEL;
  return allowedModel(id);
}
