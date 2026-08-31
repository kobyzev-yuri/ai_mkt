import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "brass" | "moss" | "terra" | "live";
}) {
  const map = {
    default: "border-line text-muted",
    brass: "border-brass/40 text-brass-2",
    moss: "border-moss/40 text-moss",
    terra: "border-terra/40 text-terra",
    live: "border-moss/40 text-moss",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${map[tone]}`}
    >
      {tone === "live" && <span className="live-dot h-1.5 w-1.5 rounded-full bg-moss" />}
      {children}
    </span>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-line bg-surface px-4 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl text-paper">{value}</p>
      {hint ? <p className="mt-1 text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function AgentMark({ name }: { name: string }) {
  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-brass/50 bg-surface-2 font-display text-sm text-brass-2"
      title={`Агент «${name}»`}
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function CategorySeal({ category }: { category: string }) {
  const glyph: Record<string, string> = {
    Упаковка: "▣",
    Металлопрокат: "⬡",
    Электроника: "⌬",
    Химия: "◈",
    Спецодежда: "▤",
    Пиломатериалы: "☰",
  };
  return (
    <div className="flex h-14 w-14 items-center justify-center border border-brass/30 bg-surface-2 font-display text-2xl text-brass">
      {glyph[category] ?? "○"}
    </div>
  );
}
