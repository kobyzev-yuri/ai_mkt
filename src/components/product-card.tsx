"use client";

import Link from "next/link";
import { companies } from "@/lib/seed";
import { days, num, rub } from "@/lib/format";
import { packingOf } from "@/lib/packing";
import type { Product } from "@/lib/types";
import { Badge, CategorySeal } from "./ui";

export function ProductCard({ product }: { product: Product }) {
  const seller = companies.find((c) => c.id === product.sellerId);
  const pack = packingOf(product);
  return (
    <Link
      href={`/catalog/${product.id}`}
      className="group flex flex-col border border-line bg-surface p-4 transition hover:border-brass/40"
    >
      <div className="flex items-start justify-between gap-3">
        <CategorySeal category={product.category} />
        <Badge>{product.category}</Badge>
      </div>
      <h3 className="mt-4 font-display text-xl leading-snug text-paper group-hover:text-brass-2">
        {product.name}
      </h3>
      <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">{product.description}</p>
      {product.specs.Вид || product.specs.Сезон ? (
        <p className="mt-2 font-mono text-[11px] text-brass">
          {[product.specs.Вид, product.specs.Сезон, product.specs.Рост ? `рост ${product.specs.Рост}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
      <div className="mt-auto flex items-end justify-between pt-5">
        <div>
          <p className="font-display text-2xl text-brass-2">
            {rub(product.price)}
            <span className="ml-1 font-sans text-[12px] text-muted">/ {product.unit}</span>
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">
            MOQ {num(product.moq)} · {pack.packUnit} {num(pack.packSize)} · {days(product.leadDays)} · {seller?.city}
          </p>
        </div>
        <p className="font-mono text-[11px] text-muted">{seller?.short}</p>
      </div>
    </Link>
  );
}