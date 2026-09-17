import { CONTROL_MODE_HINT, CONTROL_MODE_LABEL, DEFAULT_CONTROL_MODE } from "@/lib/policy";
import { compactRub } from "@/lib/format";
import type { ControlMode, TradePolicy } from "@/lib/types";

const MODES: ControlMode[] = ["threshold", "manual", "auto"];

export function TradePolicyEditor({
  policy,
  onChange,
}: {
  policy: TradePolicy;
  onChange: (next: TradePolicy) => void;
}) {
  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {MODES.map((mode) => {
          const active = policy.controlMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onChange({ ...policy, controlMode: mode })}
              className={`border px-3 py-3 text-left ${
                active ? "border-brass bg-surface-2" : "border-line bg-bg hover:border-brass/40"
              }`}
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-brass">
                {CONTROL_MODE_LABEL[mode]}
                {mode === DEFAULT_CONTROL_MODE ? " · по умолчанию" : ""}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">{CONTROL_MODE_HINT[mode]}</p>
            </button>
          );
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[13px] text-muted">
          Допуск по сумме
          <input
            type="number"
            min={0}
            step={10000}
            value={policy.autoApproveBelow}
            onChange={(e) => onChange({ ...policy, autoApproveBelow: Math.max(0, Number(e.target.value) || 0) })}
            className="mt-1 w-full border border-line bg-bg px-3 py-2 font-mono text-[13px] text-paper outline-none"
          />
          <span className="mt-1 block font-mono text-[11px] text-muted">{compactRub(policy.autoApproveBelow)}</span>
        </label>
        <label className="block text-[13px] text-muted">
          Мин. доверие контрагента
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={policy.minTrustToAuto}
            onChange={(e) =>
              onChange({ ...policy, minTrustToAuto: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })
            }
            className="mt-1 w-full border border-line bg-bg px-3 py-2 font-mono text-[13px] text-paper outline-none"
          />
          <span className="mt-1 block font-mono text-[11px] text-muted">
            Ниже порога автопрохода нет, даже на малой партии
          </span>
        </label>
      </div>
    </div>
  );
}
