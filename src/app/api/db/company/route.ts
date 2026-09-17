import { NextResponse } from "next/server";
import { createCompany } from "@/lib/db/sqlite";
import type { CreateCompanyInput } from "@/lib/db/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<CreateCompanyInput>;
    const created = createCompany({
      name: body.name ?? "",
      short: body.short,
      city: body.city ?? "",
      inn: body.inn ?? "",
      industry: body.industry,
      role: body.role === "seller" ? "seller" : "buyer",
      person: body.person,
      pin: body.pin,
      blurb: body.blurb,
    });
    return NextResponse.json(created);
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "company failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
