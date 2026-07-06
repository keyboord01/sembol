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

  return (
    <span
      className="microlabel tnum hidden items-center gap-2 text-dim sm:inline-flex"
      role="status"
      title="The current Stellar testnet ledger (block) number - updates every ~5 seconds, so a moving number means the network connection is live."
    >
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 ${stale ? "bg-amber" : "bg-long"}`}
      />
      {ledger === null
        ? "RPC OFFLINE"
        : `TESTNET · BLOCK ${ledger.toLocaleString("en-US")}`}
    </span>
  );
}
