"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { accountById, allAccounts, mergeAccounts, type Account } from "./accounts";
import { mergeCompanies } from "./roster";
import { useStore } from "./store";

const KEY = "atrium-session-v1";

type Snapshot = { accountId: string | null };

const EMPTY: Snapshot = { accountId: null };
let memory: Snapshot = EMPTY;
const listeners = new Set<() => void>();

function read(): Snapshot {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as { accountId?: string };
    if (parsed.accountId && accountById(parsed.accountId)) return { accountId: parsed.accountId };
  } catch {
    /* ignore */
  }
  return EMPTY;
}

if (typeof window !== "undefined") {
  memory = read();
}

function emit() {
  for (const fn of listeners) fn();
}

function persist(next: Snapshot) {
  memory = next.accountId ? next : EMPTY;
  try {
    if (next.accountId) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot() {
  return memory;
}

function getServerSnapshot() {
  return EMPTY;
}

function clientTrue() {
  return true;
}

function serverFalse() {
  return false;
}

function noopSubscribe() {
  return () => {};
}

type SessionStore = {
  account: Account | null;
  hydrated: boolean;
  signIn: (accountId: string, pin: string) => boolean;
  signOut: () => void;
};

const Ctx = createContext<SessionStore | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { setCompany } = useStore();
  const [rosterAt, setRosterAt] = useState(0);
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const account = useMemo(
    () => (snap.accountId ? accountById(snap.accountId) ?? null : null),
    [snap.accountId, rosterAt],
  );
  const hydrated = useSyncExternalStore(noopSubscribe, clientTrue, serverFalse);

  useEffect(() => {
    fetch("/api/db/roster")
      .then((r) => r.json())
      .then((data: { accounts?: Account[]; companies?: { id: string }[] }) => {
        if (data.companies?.length) mergeCompanies(data.companies as Parameters<typeof mergeCompanies>[0]);
        if (data.accounts?.length) mergeAccounts(data.accounts);
        const next = read();
        if (next.accountId !== memory.accountId) {
          memory = next;
          emit();
        }
        setRosterAt((n) => n + 1);
      })
      .catch(() => {
        const next = read();
        if (next.accountId !== memory.accountId) {
          memory = next;
          emit();
        }
      });
  }, []);

  const signIn = useCallback(
    (accountId: string, pin: string) => {
      const acc = allAccounts().find((a) => a.id === accountId && a.pin === pin.trim());
      if (!acc) return false;
      persist({ accountId: acc.id });
      if (acc.companyId) setCompany(acc.companyId);
      return true;
    },
    [setCompany],
  );

  const signOut = useCallback(() => {
    persist({ accountId: null });
  }, []);

  const value = useMemo(() => ({ account, hydrated, signIn, signOut }), [account, hydrated, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession outside provider");
  return ctx;
}
