"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon } from "./icons";

export type ToastKind = "ok" | "err";

interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}

type Listener = (item: ToastItem) => void;

let listeners: Listener[] = [];
let counter = 0;

/** Fire-and-forget toast from anywhere in the app. */
export function toast(kind: ToastKind, text: string): void {
  const item = { id: ++counter, kind, text };
  listeners.forEach((listener) => listener(item));
}

const DISMISS_MS = 5500;

/** Fixed bottom-right toast stack - never shifts layout. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const listener: Listener = (item) => {
      setItems((current) => [...current, item]);
      setTimeout(() => {
        setItems((current) => current.filter((existing) => existing.id !== item.id));
      }, DISMISS_MS);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((existing) => existing !== listener);
    };
  }, []);

  if (!mounted || items.length === 0) return null;

  return createPortal(
    <div className="fixed right-4 bottom-4 z-[200] flex w-[min(380px,calc(100vw-32px))] flex-col gap-2.5">
      {items.map((item) => (
        <div
          key={item.id}
          role={item.kind === "err" ? "alert" : "status"}
          className="flex items-start gap-3 rounded-2xl border border-hairline bg-raised px-4 py-3.5 text-sm shadow-[0_16px_48px_rgb(0_0_0/0.5)]"
        >
          <span
            aria-hidden
            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
              item.kind === "err" ? "bg-danger/15 text-danger" : "bg-mint/15 text-mint"
            }`}
          >
            {item.kind === "err" ? "!" : <CheckIcon size={11} strokeWidth={2.4} />}
          </span>
          <span className="flex-1 leading-relaxed text-fg">{item.text}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setItems((current) => current.filter((x) => x.id !== item.id))}
            className="text-faint transition-colors hover:text-fg"
          >
            ✕
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
