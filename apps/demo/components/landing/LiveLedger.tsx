"use client";

import { useEffect, useState } from "react";
import { usePasskeyWallet } from "@sembol/passkey-react";

/**
 * The landing page's proof of life: the actual Stellar testnet block height,
 * read live through the same kit the wallet uses, ticking as blocks close.
 */
export function LiveLedger({ tone = "ink" }: { tone?: "ink" | "paper" }) {
  const { kit } = usePasskeyWallet();
  const [ledger, setLedger] = useState<number | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!kit) return;
    let cancelled = false;
    const read = async () => {
      try {
        const latest = await kit.rpc.getLatestLedger();
        if (!cancelled) {
          setLedger(latest.sequence);
          setStale(false);
        }
      } catch {
        if (!cancelled) setStale(true);
      }
    };
    void read();
    const id = setInterval(() => void read(), 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [kit]);

  return (
    <div>
      <p
        className={`font-display tnum text-6xl leading-none font-semibold tracking-tight sm:text-8xl lg:text-[7rem] ${tone === "paper" ? "text-ink" : ""}`}
        role="status"
        aria-label={ledger === null ? "Connecting to Stellar" : `Stellar block ${ledger}`}
      >
        {ledger === null ? (
          <span className={tone === "paper" ? "text-paper-dim" : "text-faint"}>·······</span>
        ) : (
          <span key={ledger} className="tick-in inline-block">
            {ledger.toLocaleString("en-US")}
          </span>
        )}
      </p>
      <p className={`microlabel mt-4 flex items-center gap-2.5 ${tone === "paper" ? "text-paper-dim" : "text-dim"}`}>
        <span
          aria-hidden
          className={`inline-block h-2 w-2 rounded-full ${stale ? "bg-warn" : tone === "paper" ? "pulse-dot bg-brass" : "pulse-dot bg-mint"}`}
        />
        {stale ? "Reconnecting to the network…" : "Stellar testnet · a new block every ~5 seconds"}
      </p>
    </div>
  );
}
