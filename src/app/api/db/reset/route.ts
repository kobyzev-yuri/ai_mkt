import { NextResponse } from "next/server";
import { isDemoApp } from "@/lib/app-mode";
import { resetTradesToSeed } from "@/lib/db/sqlite";

export const runtime = "nodejs";

export function POST() {
  if (isDemoApp()) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  try {
    resetTradesToSeed();
    return NextResponse.json({ ok: true });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "reset failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
