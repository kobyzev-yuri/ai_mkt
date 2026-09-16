import { NextResponse } from "next/server";
import { snapshot } from "@/lib/db/sqlite";

export const runtime = "nodejs";

export function GET() {
  try {
    return NextResponse.json(snapshot());
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "db failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
