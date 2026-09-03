"use client";

import Link from "next/link";
import { usePasskeyWallet, useWalletAddress } from "@sembol/passkey-react";
import { SembolMark } from "../../../components/Brand";
import { ArrowUpRightIcon, BoltIcon, SendIcon } from "../../../components/icons";
import { RequireWallet } from "../../../components/RequireWallet";
import { useTransactionHistory, type HistoryEntry } from "../../../lib/history";

const pad2 = (n: number) => String(n).padStart(2, "0");

function HistoryList() {
  const { address, config } = usePasskeyWallet();
  const { explorerUrl } = useWalletAddress();
  const entries = useTransactionHistory(address);

  return (
    <div className="flex flex-col gap-7 py-2">
      <div>
        <p className="microlabel text-gold">Activity</p>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight uppercase">
            History
          </h1>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-dim transition-colors hover:text-gold"
            >
              Full on-chain history <ArrowUpRightIcon size={13} />
            </a>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <SembolMark size={34} className="text-gold/50" title="" />
          <p className="mt-5 font-medium">Nothing here yet</p>
          <p className="mt-1.5 max-w-xs text-sm text-dim">
            Payments made from this device will show up here.
          </p>
          <Link href="/send" className="btn-gold mt-6 h-11 px-6 text-sm">
            Send your first payment
          </Link>
        </div>
      ) : (
        <ol className="card divide-y divide-hairline overflow-hidden">
          {entries.map((entry, index) => (
            <HistoryRow
              key={`${entry.hash}-${entry.timestamp}`}
              entry={entry}
              index={entries.length - index}
              explorerBaseUrl={config.explorerBaseUrl}
            />
          ))}
        </ol>
      )}

      <p className="text-sm text-faint">
        Stored locally per wallet. The explorer link above is the complete on-chain record.
      </p>
    </div>
  );
}

function HistoryRow({
  entry,
  index,
  explorerBaseUrl,
}: {
  entry: HistoryEntry;
  index: number;
  explorerBaseUrl?: string | null;
}) {
  const visual =
    entry.kind === "send"
      ? { icon: <SendIcon size={16} />, tone: "bg-gold/12 text-gold", label: "Sent" }
      : entry.kind === "fund"
        ? { icon: <BoltIcon size={16} />, tone: "bg-mint/12 text-mint", label: "Received" }
        : {
            icon: <SembolMark size={15} title="" />,
            tone: "bg-raised text-dim",
            label: "Created",
          };

  return (
    <li className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-raised/60">
      <span
        aria-hidden
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${visual.tone}`}
      >
        {visual.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {entry.kind === "send" && entry.amount ? (
            <>
              {visual.label} {entry.amount} XLM
              {entry.to && (
                <span className="tnum font-normal text-dim">
                  {" "}
                  → {entry.to.slice(0, 6)}…{entry.to.slice(-6)}
                </span>
              )}
            </>
          ) : entry.kind === "fund" ? (
            "Friendbot deposit"
          ) : (
            "Wallet deployed"
          )}
        </span>
        <span className="tnum mt-0.5 block font-mono text-xs text-faint">
          #{pad2(index)} · {new Date(entry.timestamp).toLocaleString()}
        </span>
      </span>
      {entry.hash && explorerBaseUrl ? (
        <a
          href={`${explorerBaseUrl}/tx/${entry.hash}`}
          target="_blank"
          rel="noreferrer"
          className="tnum inline-flex shrink-0 items-center gap-1 font-mono text-xs text-faint transition-colors group-hover:text-gold"
        >
          {entry.hash.slice(0, 6)}…{entry.hash.slice(-6)}
          <ArrowUpRightIcon size={11} />
        </a>
      ) : (
        <span aria-hidden />
      )}
    </li>
  );
}

export default function HistoryPage() {
  return (
    <RequireWallet>
      <HistoryList />
    </RequireWallet>
  );
}
