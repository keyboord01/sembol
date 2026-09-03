"use client";

import { useState } from "react";
import { ArrowUpRightIcon, CheckIcon, CopyIcon } from "../icons";

/** Copy-page-as-Markdown + view-raw, the AI-agent affordances. */
export function PageActions({ mdPath }: { mdPath: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      const res = await fetch(mdPath);
      await navigator.clipboard.writeText(await res.text());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* offline or blocked clipboard */
    }
  };
  return (
    <div className="mt-5 flex flex-wrap gap-2.5">
      <button
        type="button"
        onClick={() => void copy()}
        className={`chip transition-colors ${copied ? "border-mint/50 text-mint" : "hover:border-gold/50 hover:text-gold"}`}
      >
        {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
        {copied ? "Copied" : "Copy as Markdown"}
      </button>
      <a href={mdPath} target="_blank" rel="noreferrer" className="chip transition-colors hover:border-gold/50 hover:text-gold">
        View raw
        <ArrowUpRightIcon size={12} />
      </a>
    </div>
  );
}
