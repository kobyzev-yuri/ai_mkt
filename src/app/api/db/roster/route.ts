import { NextResponse } from "next/server";
import { roster } from "@/lib/db/sqlite";

export const runtime = "nodejs";

export function GET() {
  try {
    return NextResponse.json(roster());
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "roster failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
