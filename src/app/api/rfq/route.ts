import { NextResponse } from "next/server";
import { createRfq } from "@/lib/agents";
import { isDemoApp } from "@/lib/app-mode";
import { voiceDeals } from "@/lib/llm-agents";
import { allowedModel, DEFAULT_MODEL } from "@/lib/ollama";
import { sanitizeNeed } from "@/lib/parse-need";
import { roster } from "@/lib/db/sqlite";
import type { BargainTactic, Lot, Need, TrustScore } from "@/lib/types";

export const maxDuration = 120;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    query?: string;
    buyerId?: string;
    model?: string;
    need?: Partial<Need>;
    reputations?: Record<string, TrustScore>;
    lots?: Lot[];
    tactics?: Record<string, BargainTactic>;
  };
  const query = body.query?.trim() ?? "";
  const buyer = roster().companies.find((c) => c.id === body.buyerId);
  if (query.length < 3) {
    return NextResponse.json({ error: "too short" }, { status: 400 });
  }
  if (!buyer || buyer.role === "seller") {
    return NextResponse.json({ error: "need a buyer company" }, { status: 400 });
  }
  if (!body.need) {
    return NextResponse.json({ error: "need confirmation first" }, { status: 400 });
  }
  const model = allowedModel(body.model ?? DEFAULT_MODEL);
  const need = sanitizeNeed(query, body.need);
  const { rfq, deals } = createRfq(buyer.id, query, need, body.reputations, body.lots, body.tactics);
  if (isDemoApp()) {
    return NextResponse.json({ rfq, deals, model, llm: false, need });
  }
  const voiced = await voiceDeals(deals, model);
  const llm = voiced.some((d) => d.voicedBy);
  return NextResponse.json({ rfq, deals: voiced, model, llm, need });
}
