import { NextResponse } from "next/server";
import { parseBuyerNeed } from "@/lib/llm-agents";
import { allowedModel, DEFAULT_MODEL } from "@/lib/ollama";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as { query?: string; model?: string };
  const query = body.query?.trim() ?? "";
  if (query.length < 3) {
    return NextResponse.json({ error: "too short" }, { status: 400 });
  }
  const model = allowedModel(body.model ?? DEFAULT_MODEL);
  const parsed = await parseBuyerNeed(query, model);
  return NextResponse.json({ ...parsed, model });
}
