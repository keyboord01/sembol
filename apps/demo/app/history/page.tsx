"use client";

import Link from "next/link";
import { usePasskeyWallet, useWalletAddress } from "@sembol/passkey-react";
import { RequireWallet } from "../../components/RequireWallet";
import { useTransactionHistory, type HistoryEntry } from "../../lib/history";

const KIND_LABELS: Record<HistoryEntry["kind"], string> = {
  create: "Wallet created",
  fund: "Friendbot funding",
  send: "Payment sent",
};

function HistoryList() {
  const { address, config } = usePasskeyWallet();
  const { explorerUrl } = useWalletAddress();
  const entries = useTransactionHistory(address);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-indigo-600 underline dark:text-indigo-400"
          >
            Full on-chain history ↗
          </a>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-10 text-center backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-slate-600 dark:text-slate-400">No transactions from this device yet.</p>
          <Link href="/send" className="sembol-btn sembol-btn--primary mt-4 inline-flex">
            Send your first payment
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={`${entry.hash}-${entry.timestamp}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/60 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div>
                <p className="text-sm font-medium">
                  {KIND_LABELS[entry.kind]}
                  {entry.kind === "send" && entry.amount && (
                    <span className="text-slate-500"> · {entry.amount} XLM</span>
                  )}
                </p>
                {entry.to && (
                  <p className="font-mono text-xs text-slate-500">
                    → {entry.to.slice(0, 8)}…{entry.to.slice(-8)}
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  {new Date(entry.timestamp).toLocaleString()}
                </p>
              </div>
              {entry.hash && config.explorerBaseUrl && (
                <a
                  href={`${config.explorerBaseUrl}/tx/${entry.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-indigo-600 underline dark:text-indigo-400"
                >
                  {entry.hash.slice(0, 8)}…{entry.hash.slice(-8)} ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-slate-500">
        This list is stored locally in your browser (per wallet). The stellar.expert link above
        shows the complete on-chain record.
      </p>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <RequireWallet>
      <HistoryList />
    </RequireWallet>
  );
}
