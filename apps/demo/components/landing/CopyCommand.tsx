"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "../icons";

/** The install one-liner with a copy button. */
export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked - nothing to do */
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={copied ? "Copied" : `Copy command: ${command}`}
      className="group inline-flex max-w-full items-center gap-3 rounded-xl border border-hairline bg-ink px-4 py-3 text-left transition-colors hover:border-gold/50"
    >
      <span aria-hidden className="text-faint select-none">$</span>
      <code className="tnum truncate font-mono text-sm text-fg">{command}</code>
      <span
        aria-hidden
        className={`ml-1 shrink-0 transition-colors ${copied ? "text-mint" : "text-faint group-hover:text-gold"}`}
      >
        {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
      </span>
    </button>
  );
}
