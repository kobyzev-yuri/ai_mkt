import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import type { StubCopy } from "@/lib/stubs";

export function IdeaStub({
  stub,
  preview,
}: {
  stub: StubCopy;
  preview?: ReactNode;
}) {
  return (
    <aside className="border border-dashed border-brass/35 bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brass">заглушка</Badge>
        <p className="font-mono text-[10px] uppercase tracking-widest text-brass">{stub.channel}</p>
      </div>
      <h3 className="mt-3 font-display text-2xl">{stub.title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{stub.idea}</p>
      {preview ? <div className="mt-4">{preview}</div> : null}
      <p className="mt-3 font-mono text-[11px] text-muted">Не делаем: {stub.skip}</p>
    </aside>
  );
}

export function MessengerPreview({ text }: { text: string }) {
  return (
    <p className="border border-line bg-bg px-4 py-3 text-[13px] leading-relaxed text-paper/90">«{text}»</p>
  );
}
