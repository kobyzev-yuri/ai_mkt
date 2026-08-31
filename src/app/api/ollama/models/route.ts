import { NextResponse } from "next/server";
import { listOllamaModels, OLLAMA_HOST, OLLAMA_MODELS } from "@/lib/ollama";

export const dynamic = "force-dynamic";

export async function GET() {
  const live = await listOllamaModels();
  const preferred = OLLAMA_MODELS.filter((m) => live.includes(m.id));
  const extra = live.filter((name) => !OLLAMA_MODELS.some((m) => m.id === name));
  return NextResponse.json({
    host: OLLAMA_HOST,
    models: [
      ...preferred.map((m) => ({ id: m.id, label: m.label, hint: m.hint })),
      ...extra.map((id) => ({ id, label: id, hint: "установлена локально" })),
    ],
  });
}
