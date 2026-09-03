"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "../icons";

export function CodeBlock({ lang, code, title }: { lang: string; code: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="group/code my-5 overflow-hidden rounded-xl border border-hairline bg-ink">
      <div className="flex items-center gap-3 border-b border-hairline/60 px-4 py-2">
        <span className="microlabel text-faint">{title ?? lang}</span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code"
          className={`ml-auto inline-flex items-center gap-1.5 text-xs transition-colors ${copied ? "text-mint" : "text-faint hover:text-fg"}`}
        >
          {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="tnum overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-fg">
        <code>{code}</code>
      </pre>
    </div>
  );
}
