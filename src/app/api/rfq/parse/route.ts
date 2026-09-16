import { NextResponse } from "next/server";
import { isDemoApp } from "@/lib/app-mode";
import { parseBuyerNeed } from "@/lib/llm-agents";
import { allowedModel, DEFAULT_MODEL } from "@/lib/ollama";
import { parseNeed } from "@/lib/parse-need";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as { query?: string; model?: string };
  const query = body.query?.trim() ?? "";
  if (query.length < 3) {
    return NextResponse.json({ error: "too short" }, { status: 400 });
  }
  const model = allowedModel(body.model ?? DEFAULT_MODEL);
  if (isDemoApp()) {
    const rules = parseNeed(query);
    return NextResponse.json({ need: rules, rules, llm: false, model });
  }
  const parsed = await parseBuyerNeed(query, model);
  return NextResponse.json({ ...parsed, model });
}
