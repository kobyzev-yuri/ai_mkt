import { NextResponse } from "next/server";
import { createSku } from "@/lib/db/sqlite";
import type { CreateSkuInput } from "@/lib/db/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<CreateSkuInput>;
    const created = createSku({
      name: body.name ?? "",
      category: body.category ?? "Упаковка",
      unit: body.unit ?? "шт",
      moq: Number(body.moq) || 1,
      packSize: Number(body.packSize) || Number(body.moq) || 1,
      packUnit: body.packUnit ?? "партия",
      description: body.description,
      tags: body.tags,
      specs: body.specs,
      sellerId: body.sellerId ?? "",
      article: body.article ?? "",
      price: body.price,
      stock: body.stock,
      leadDays: body.leadDays,
    });
    return NextResponse.json(created);
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "sku failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
