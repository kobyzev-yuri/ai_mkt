import type { Product, SpecCheck } from "@/lib/types";

export function SpecSheet({
  product,
  check,
}: {
  product: Product;
  check?: SpecCheck;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Техническая спецификация</p>
      <p className="mt-1 text-[12px] text-muted">
        Паспорт позиции для сверки с заявкой. Номенклатура — название и SKU, торг открывается только если спека закрывает запрос.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-px border border-line bg-line">
        <div className="bg-surface px-4 py-3">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">SKU</dt>
          <dd className="mt-1 text-[14px]">{product.sku}</dd>
        </div>
        <div className="bg-surface px-4 py-3">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">Единица</dt>
          <dd className="mt-1 text-[14px]">{product.unit}</dd>
        </div>
        {Object.entries(product.specs).map(([k, v]) => (
          <div key={k} className="bg-surface px-4 py-3">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">{k}</dt>
            <dd className="mt-1 text-[14px]">{v}</dd>
          </div>
        ))}
      </dl>
      {check ? (
        <ul className="mt-4 space-y-1 text-[13px] text-muted">
          {check.hits.map((line) => (
            <li key={line} className="text-moss">
              · {line}
            </li>
          ))}
          {check.gaps.map((line) => (
            <li key={line} className="text-brass">
              · {line}
            </li>
          ))}
          {check.clashes.map((line) => (
            <li key={line} className="text-terra">
              · {line}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
