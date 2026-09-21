import { NextResponse } from "next/server";
import { TIMEWEB_MODELS } from "@/lib/llm-models";
import { listTimewebModels, timewebConfigured, timewebPicker } from "@/lib/timeweb";

export const dynamic = "force-dynamic";

export async function GET() {
  const live = await listTimewebModels();
  const models = live.length ? timewebPicker(live) : TIMEWEB_MODELS.map((m) => ({ id: m.id, label: m.label, hint: m.hint }));
  return NextResponse.json({
    host: "https://api.timeweb.ai/v1",
    channel: timewebConfigured() ? "timeweb" : "ollama",
    models,
  });
}
