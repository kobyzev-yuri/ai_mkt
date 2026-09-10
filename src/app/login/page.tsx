"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ACCOUNTS, deskHome, deskLabel } from "@/lib/accounts";
import { useSession } from "@/lib/session";

export default function LoginPage() {
  const { signIn } = useSession();
  const router = useRouter();
  const [password, setPassword] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  function enter(id: string) {
    const typed = (password[id] ?? ACCOUNTS.find((a) => a.id === id)?.pin ?? "").trim();
    const ok = signIn(id, typed);
    if (!ok) {
      setErr("Неверный пароль");
      return;
    }
    const acc = ACCOUNTS.find((a) => a.id === id)!;
    router.replace(deskHome(acc.desk));
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-brass">Маркетплейс · вход</p>
      <h1 className="mt-2 font-display text-5xl leading-tight">Чей кабинет</h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
        Выберите участника и введите пароль с карточки. Три контура: закупщик, поставщик, владелец площадки.
      </p>
      {err ? <p className="mt-4 text-[13px] text-terra">{err}</p> : null}

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ACCOUNTS.map((acc) => (
          <article key={acc.id} className="flex flex-col border border-line bg-surface p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-brass">{deskLabel(acc.desk)}</p>
            <h2 className="mt-2 font-display text-3xl">{acc.org}</h2>
            <p className="mt-1 text-[13px] text-muted">{acc.person}</p>
            <p className="mt-3 flex-1 text-[14px] leading-relaxed text-muted">{acc.blurb}</p>
            <label className="mt-5 font-mono text-[10px] uppercase tracking-widest text-muted" htmlFor={`pw-${acc.id}`}>
              Пароль {acc.pin}
            </label>
            <input
              id={`pw-${acc.id}`}
              type="password"
              autoComplete="off"
              value={password[acc.id] ?? acc.pin}
              onChange={(e) => {
                setPassword((p) => ({ ...p, [acc.id]: e.target.value }));
                setErr(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") enter(acc.id);
              }}
              className="mt-2 border border-line bg-bg px-3 py-2 font-mono text-[14px] outline-none"
            />
            <button
              type="button"
              onClick={() => enter(acc.id)}
              className="mt-4 rounded-full bg-brass px-4 py-2 text-[13px] font-medium text-bg hover:bg-brass-2"
            >
              Войти как {acc.org}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
