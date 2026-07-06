"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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

/** Fixed bottom-right toast stack - terminal-styled, never shifts layout. */
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
    <div className="fixed right-4 bottom-4 z-[200] flex w-[min(380px,calc(100vw-32px))] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          role={item.kind === "err" ? "alert" : "status"}
          className={`flex items-start gap-3 border bg-ink px-4 py-3 text-sm shadow-[0_24px_48px_rgb(0_0_0/0.5)] ${
            item.kind === "err" ? "border-short/50 text-short" : "border-long/50 text-long"
          }`}
        >
          <span aria-hidden className="microlabel mt-0.5">
            {item.kind === "err" ? "ERR" : "OK"}
          </span>
          <span className="flex-1 leading-relaxed">{item.text}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setItems((current) => current.filter((x) => x.id !== item.id))}
            className="text-dim transition-colors hover:text-fg"
          >
            ✕
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
