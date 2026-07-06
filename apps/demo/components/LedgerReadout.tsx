"use client";

import { useEffect, useState } from "react";
import { usePasskeyWallet } from "@sembol/passkey-react";

/** Live testnet ledger counter - proof of life in the status strip. */
export function LedgerReadout() {
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
    const id = setInterval(() => void read(), 6000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [kit]);

  const label = ledger === null ? "OFFLINE" : `BLOCK ${ledger.toLocaleString("en-US")}`;

  return (
    <span
      className="microlabel tnum inline-flex items-center gap-2 text-dim"
      role="status"
      title={
        ledger === null
          ? "Not connected to the Stellar testnet RPC."
          : "Live Stellar testnet block height - it ticks every ~5 seconds while the network connection is healthy."
      }
    >
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 ${stale || ledger === null ? "bg-amber" : "bg-long"}`}
      />
      {/* Dot + block number on mobile; full label from sm up. */}
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only">Testnet {label}</span>
    </span>
  );
}
