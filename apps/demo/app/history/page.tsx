"use client";

import Link from "next/link";
import { usePasskeyWallet, useWalletAddress } from "@sembol/passkey-react";
import { RequireWallet } from "../../components/RequireWallet";
import { useTransactionHistory, type HistoryEntry } from "../../lib/history";

const KIND_META: Record<HistoryEntry["kind"], { label: string; tone: string }> = {
  create: { label: "Create", tone: "text-amber" },
  fund: { label: "Fund", tone: "text-long" },
  send: { label: "Send", tone: "text-long" },
};

const pad2 = (n: number) => String(n).padStart(2, "0");

function HistoryList() {
  const { address, config } = usePasskeyWallet();
  const { explorerUrl } = useWalletAddress();
  const entries = useTransactionHistory(address);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between border-b border-hairline pb-4">
        <p className="microlabel text-dim">01 · Execution log</p>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="microlabel text-dim transition-colors hover:text-long"
          >
            Full on-chain history ↗
          </a>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="border border-hairline px-6 py-16 text-center">
          <p className="microlabel text-dim">No executions from this device</p>
          <Link
            href="/send"
            className="microlabel mt-5 inline-flex h-10 items-center border border-long bg-long px-5 font-medium text-ink transition-colors hover:bg-transparent hover:text-long"
          >
            Send your first payment →
          </Link>
        </div>
      ) : (
        <ol className="divide-y divide-hairline border border-hairline">
          {entries.map((entry, index) => {
            const meta = KIND_META[entry.kind];
            return (
              <li
                key={`${entry.hash}-${entry.timestamp}`}
                className="group grid grid-cols-[4.25rem_1fr_auto] items-baseline gap-3 px-4 py-4 transition-colors hover:bg-surface sm:grid-cols-[2.75rem_5rem_1fr_auto] sm:gap-4 sm:px-5"
              >
                <span className="microlabel tnum hidden text-dim sm:block">
                  #{pad2(entries.length - index)}
                </span>
                <span className={`microlabel ${meta.tone}`}>{meta.label}</span>
                <span className="min-w-0">
                  <span className="tnum block truncate text-sm text-fg">
                    {entry.kind === "send" && entry.amount ? (
                      <>
                        {entry.amount} XLM
                        {entry.to && (
                          <span className="text-dim">
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
                  <span className="microlabel tnum text-dim">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </span>
                {entry.hash && config.explorerBaseUrl ? (
                  <a
                    href={`${config.explorerBaseUrl}/tx/${entry.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="microlabel tnum text-dim transition-colors group-hover:text-long"
                  >
                    {entry.hash.slice(0, 6)}…{entry.hash.slice(-6)} ↗
                  </a>
                ) : (
                  <span aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      )}

      <p className="microlabel text-dim">
        Stored locally per wallet · the explorer link above is the complete on-chain record
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
