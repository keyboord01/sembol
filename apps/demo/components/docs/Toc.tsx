"use client";

import { useEffect, useState } from "react";

interface Item { id: string; text: string; level: 2 | 3 }

/** "On this page" with scrollspy: the topic in view stays highlighted. */
export function Toc({ items }: { items: Item[] }) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    if (items.length === 0) return;
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);

    const onScroll = () => {
      // active = last heading above the reading line (30% down the viewport)
      const line = window.innerHeight * 0.3;
      let current = headings[0]?.id ?? "";
      for (const el of headings) {
        if (el.getBoundingClientRect().top <= line) current = el.id;
        else break;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="microlabel mb-3 text-faint">On this page</p>
      <ul className="flex flex-col border-l border-hairline/70">
        {items.map(({ id, text, level }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={active === id ? "location" : undefined}
              className={`-ml-px block border-l py-1.5 transition-colors ${level === 3 ? "pl-7" : "pl-4"} ${
                active === id
                  ? "border-gold font-medium text-gold"
                  : "border-transparent text-dim hover:border-hairline hover:text-fg"
              }`}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
