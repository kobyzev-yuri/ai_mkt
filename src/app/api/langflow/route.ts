import { NextResponse } from "next/server";
import { pingLangflow, runLangflowBus } from "@/lib/langflow";

export const maxDuration = 60;

export async function GET() {
  const ok = await pingLangflow();
  return NextResponse.json({ ok, url: process.env.LANGFLOW_URL ?? "http://127.0.0.1:7860" });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { query?: string; approve?: boolean; escalate?: boolean };
  const query = body.query?.trim() ?? "";
  if (query.length < 3) {
    return NextResponse.json({ error: "too short" }, { status: 400 });
  }
  try {
    const bus = await runLangflowBus({
      query,
      approve: body.approve,
      escalate: body.escalate,
    });
    return NextResponse.json(bus);
  } catch (err) {
    const message = err instanceof Error ? err.message : "langflow failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
