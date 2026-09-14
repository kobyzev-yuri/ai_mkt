import { CONTROL_EXAMPLES } from "@/lib/control-examples";

export function ControlExamplesTable() {
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[720px] text-left text-[13px]">
        <thead className="bg-surface font-mono text-[10px] uppercase tracking-widest text-muted">
          <tr>
            <th className="px-4 py-3 font-normal">Где</th>
            <th className="px-4 py-3 font-normal">Ошибка</th>
            <th className="px-4 py-3 font-normal">Что видит</th>
            <th className="px-4 py-3 font-normal">Что скрыто</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {CONTROL_EXAMPLES.map((row) => (
            <tr key={`${row.where}-${row.mistake}`} className="bg-bg">
              <td className="px-4 py-3 font-mono text-[12px] text-brass">{row.where}</td>
              <td className="px-4 py-3">{row.mistake}</td>
              <td className="px-4 py-3 text-paper">{row.sees}</td>
              <td className="px-4 py-3 text-muted">{row.hides}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
