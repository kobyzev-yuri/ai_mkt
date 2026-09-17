import { NextResponse } from "next/server";
import { isDemoApp } from "@/lib/app-mode";
import { syncTrades } from "@/lib/db/sqlite";
import type { Deal, Order, Rfq } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isDemoApp()) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  try {
    const body = (await req.json()) as { rfqs?: Rfq[]; deals?: Deal[]; orders?: Order[] };
    syncTrades(body.rfqs ?? [], body.deals ?? [], body.orders ?? []);
    return NextResponse.json({ ok: true });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
