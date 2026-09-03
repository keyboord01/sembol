import Link from "next/link";
import type { Block } from "../../lib/docs-content";
import { headingId } from "../../lib/docs-content";
import { CodeBlock } from "./CodeBlock";

/** Inline markdown: `code`, **bold**, [text](href). Content is first-party. */
export function inline(md: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(md)) !== null) {
    if (m.index > last) parts.push(md.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("`")) {
      parts.push(
        <code key={key++} className="rounded-md border border-hairline/60 bg-surface px-1.5 py-0.5 font-mono text-[0.85em] text-fg">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      parts.push(<strong key={key++} className="font-semibold text-fg">{token.slice(2, -2)}</strong>);
    } else {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(token)!;
      const [, text, href] = mm;
      parts.push(
        href.startsWith("/") ? (
          <Link key={key++} href={href} className="text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-gold">
            {text}
          </Link>
        ) : (
          <a key={key++} href={href} target="_blank" rel="noreferrer" className="text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-gold">
            {text}
          </a>
        ),
      );
    }
    last = m.index + token.length;
  }
  if (last < md.length) parts.push(md.slice(last));
  return parts;
}

export function RenderBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "p":
            return <p key={i} className="my-4 leading-relaxed">{inline(b.md)}</p>;
          case "h2":
            return (
              <h2 key={i} id={headingId(b.text)} className="group font-display mt-12 mb-4 scroll-mt-28 border-b border-hairline/50 pb-2.5 text-xl font-semibold tracking-wide text-fg uppercase">
                <a href={`#${headingId(b.text)}`} className="hover:text-gold">{b.text}</a>
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} id={headingId(b.text)} className="mt-8 mb-3 scroll-mt-28 text-base font-semibold text-fg">
                <a href={`#${headingId(b.text)}`} className="hover:text-gold">{b.text}</a>
              </h3>
            );
          case "code":
            return <CodeBlock key={i} lang={b.lang} code={b.code} title={b.title} />;
          case "ul":
            return (
              <ul key={i} className="my-4 flex list-none flex-col gap-2.5">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-3 leading-relaxed">
                    <span aria-hidden className="mt-[0.62em] h-1.5 w-1.5 shrink-0 rotate-45 bg-gold/70" />
                    <span>{inline(item)}</span>
                  </li>
                ))}
              </ul>
            );
          case "callout":
            return (
              <div
                key={i}
                className={`my-5 rounded-xl border px-4 py-3.5 text-[15px] leading-relaxed ${
                  b.kind === "warn" ? "border-warn/40 bg-warn/8" : "border-gold/35 bg-gold/8"
                }`}
              >
                {inline(b.md)}
              </div>
            );
          case "table":
            return (
              <div key={i} className="my-5 overflow-x-auto rounded-xl border border-hairline">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-hairline bg-surface">
                      {b.head.map((h) => (
                        <th key={h} className="px-4 py-2.5 font-medium text-fg">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline/60">
                    {b.rows.map((r, ri) => (
                      <tr key={ri}>
                        {r.map((c, ci) => (
                          <td key={ci} className={`px-4 py-2.5 ${ci === 0 ? "whitespace-nowrap" : ""}`}>
                            {inline(c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </>
  );
}
