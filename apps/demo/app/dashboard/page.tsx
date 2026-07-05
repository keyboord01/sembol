"use client";

import { useState } from "react";
import Link from "next/link";
import {
  toSembolError,
  usePasskeyWallet,
  useWalletAddress,
  WalletBalance,
} from "@sembol/passkey-react";
import { RequireWallet } from "../../components/RequireWallet";
import { recordTransaction } from "../../lib/history";

function Dashboard() {
  const { fund, address } = usePasskeyWallet();
  const { displayAddress, explorerUrl, copy, copied } = useWalletAddress({
    truncate: { start: 8, end: 8 },
  });
  const [funding, setFunding] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleFund = async () => {
    setFunding(true);
    setNotice(null);
    try {
      const result = await fund();
      setNotice({ kind: "ok", text: `Received ${result.amount ?? "test"} XLM from Friendbot.` });
      if (address && result.hash) {
        recordTransaction(address, { hash: result.hash, kind: "fund" });
      }
    } catch (err) {
      setNotice({ kind: "err", text: toSembolError(err).userMessage });
    } finally {
      setFunding(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <section className="rounded-2xl border border-slate-200 bg-white/60 p-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
        <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Balance</h2>
        <div className="mt-2 text-4xl font-bold tracking-tight">
          <WalletBalance />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleFund()}
            disabled={funding}
            className="sembol-btn sembol-btn--secondary"
          >
            {funding ? "Requesting…" : "Get test XLM"}
          </button>
          <Link href="/send" className="sembol-btn sembol-btn--primary">
            Send payment
          </Link>
        </div>
        {notice && (
          <p
            role={notice.kind === "err" ? "alert" : "status"}
            className={`mt-4 text-sm ${
              notice.kind === "err"
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {notice.text}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/60 p-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
        <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Your smart account
        </h2>
        <p className="mt-2 font-mono text-sm break-all">{address}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => void copy()}
            className="sembol-btn sembol-btn--ghost"
          >
            {copied ? "Copied ✓" : "Copy address"}
          </button>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 underline dark:text-indigo-400"
            >
              View on stellar.expert ↗
            </a>
          )}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          {displayAddress} is a smart-account <em>contract</em> on Stellar testnet — not a
          classic account. It's controlled by the passkey on this device.
        </p>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireWallet>
      <Dashboard />
    </RequireWallet>
  );
}
