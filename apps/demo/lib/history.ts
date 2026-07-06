"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface HistoryEntry {
  hash: string;
  kind: "create" | "fund" | "send";
  amount?: string;
  to?: string;
  timestamp: number;
}

const STORAGE_PREFIX = "sembol-demo:history:";
const CHANGE_EVENT = "sembol-demo:history-change";

function storageKey(address: string): string {
  return `${STORAGE_PREFIX}${address}`;
}

function read(address: string): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(address));
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/** Persist a transaction for the wallet's local history. */
export function recordTransaction(address: string, entry: Omit<HistoryEntry, "timestamp">): void {
  if (typeof window === "undefined") return;
  const entries = [{ ...entry, timestamp: Date.now() }, ...read(address)].slice(0, 100);
  window.localStorage.setItem(storageKey(address), JSON.stringify(entries));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

const EMPTY: HistoryEntry[] = [];
const cache = new Map<string, { raw: string | null; parsed: HistoryEntry[] }>();

function getSnapshot(address: string | null): HistoryEntry[] {
  if (!address || typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(storageKey(address));
  const cached = cache.get(address);
  if (cached && cached.raw === raw) return cached.parsed;
  let parsed: HistoryEntry[] = EMPTY;
  try {
    parsed = raw ? (JSON.parse(raw) as HistoryEntry[]) : EMPTY;
    if (!Array.isArray(parsed)) parsed = EMPTY;
  } catch {
    parsed = EMPTY; // corrupt storage must not crash the page
  }
  cache.set(address, { raw, parsed });
  return parsed;
}

/** Reactive local transaction history for a wallet address. */
export function useTransactionHistory(address: string | null): HistoryEntry[] {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(address),
    () => EMPTY,
  );
}
