"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SearchEntry } from "../../lib/docs-content";
import { SembolMark } from "../Brand";

interface NavPage { slug: string; title: string; group: string; path: string }

/** Sidebar with active-page highlight + Cmd-K search over the docs index. */
export function DocsNav({ pages, groups, index }: { pages: NavPage[]; groups: string[]; index: SearchEntry[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results =
    q.trim().length < 2
      ? []
      : index
          .filter((e) => (e.page + " " + e.heading + " " + e.text).toLowerCase().includes(q.trim().toLowerCase()))
          .slice(0, 10);

  const go = (e: SearchEntry) => {
    setOpen(false);
    const path = e.slug === "index" ? "/docs" : `/docs/${e.slug}`;
    router.push(e.id ? `${path}#${e.id}` : path);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-5 flex w-full items-center gap-2.5 rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-sm text-faint transition-colors hover:border-gold/40 hover:text-dim"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        Search docs
        <kbd className="ml-auto rounded-md border border-hairline px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>

      {groups.map((group) => (
        <div key={group} className="mb-6">
          <p className="microlabel mb-2 text-faint">{group}</p>
          <ul className="flex flex-col gap-0.5">
            {pages
              .filter((p) => p.group === group)
              .map((p) => {
                const active = pathname === p.path;
                return (
                  <li key={p.slug}>
                    <Link
                      href={p.path}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                        active ? "bg-gold/12 font-medium text-gold" : "text-dim hover:bg-raised hover:text-fg"
                      }`}
                    >
                      <SembolMark size={10} title="" className={active ? "text-gold" : "text-faint"} />
                      {p.title}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center bg-ink/80 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Search documentation"
        >
          <div
            className="card w-full max-w-lg overflow-hidden p-0 shadow-[0_32px_80px_rgb(0_0_0/0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[0]) go(results[0]);
              }}
              placeholder="Search the docs…"
              className="w-full border-b border-hairline bg-transparent px-5 py-4 text-base text-fg outline-none placeholder:text-faint"
            />
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {q.trim().length >= 2 && results.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-faint">Nothing found for &quot;{q}&quot;</p>
              )}
              {results.map((r, i) => (
                <button
                  key={`${r.slug}-${r.id}-${i}`}
                  type="button"
                  onClick={() => go(r)}
                  className="block w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-raised"
                >
                  <span className="block text-sm font-medium text-fg">
                    {r.page}
                    {r.heading && <span className="text-dim"> › {r.heading}</span>}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-faint">{r.text}</span>
                </button>
              ))}
              {q.trim().length < 2 && (
                <p className="px-3 py-6 text-center text-sm text-faint">Type at least two characters</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Mobile: horizontal page tabs under the docs header. */
export function MobileDocsTabs({ pages }: { pages: NavPage[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Docs pages" className="scrollbar-none -mx-5 overflow-x-auto px-5 lg:hidden">
      <div className="flex w-max gap-2 border-b border-hairline/60 pb-3">
        {pages.map((p) => {
          const active = pathname === p.path;
          return (
            <Link
              key={p.slug}
              href={p.path}
              aria-current={active ? "page" : undefined}
              className={`chip whitespace-nowrap transition-colors ${active ? "border-gold/60 text-gold" : "hover:text-fg"}`}
            >
              {p.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
