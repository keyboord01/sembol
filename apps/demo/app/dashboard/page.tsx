"use client";

import { useState } from "react";
import Link from "next/link";
import {
  toSembolError,
  usePasskeyWallet,
  useWalletAddress,
  useWalletBalance,
} from "@sembol/passkey-react";
import { RequireWallet } from "../../components/RequireWallet";
import { recordTransaction } from "../../lib/history";

function Dashboard() {
  const { fund, address } = usePasskeyWallet();
  const { explorerUrl, copy, copied } = useWalletAddress();
  const { formatted, symbol, status: balanceStatus, isRefreshing, refetch } = useWalletBalance();
  const [funding, setFunding] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleFund = async () => {
    setFunding(true);
    setNotice(null);
    try {
      const result = await fund();
      setNotice({ kind: "ok", text: `Received ${result.amount ?? "test"} XLM from Friendbot` });
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
    <div className="flex flex-col gap-10">
      <p className="microlabel border-b border-hairline pb-3 text-dim">01 · Account</p>

      <section className="grid gap-10 md:grid-cols-[1fr_260px]">
        <div>
          <p className="microlabel text-dim">Available balance</p>
          <p className="font-display tnum mt-2 text-6xl font-semibold tracking-tight">
            {balanceStatus === "success" ? (
              <>
                {formatted}
                <span className="ml-3 text-lg text-dim">{symbol}</span>
              </>
            ) : balanceStatus === "error" ? (
              <span className="text-2xl text-short">unavailable</span>
            ) : (
              <span className="text-dim">·····</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isRefreshing}
            className="microlabel mt-2 text-dim transition-colors hover:text-fg disabled:opacity-40"
          >
            {isRefreshing ? "Refreshing…" : "↻ Refresh"}
          </button>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/send"
              className="microlabel inline-flex h-10 items-center border border-long bg-long px-5 font-medium text-ink transition-colors hover:bg-transparent hover:text-long"
            >
              Send payment →
            </Link>
            <button
              type="button"
              onClick={() => void handleFund()}
              disabled={funding}
              className="microlabel inline-flex h-10 items-center border border-hairline px-5 text-fg transition-colors hover:border-long hover:text-long disabled:cursor-not-allowed disabled:opacity-40"
            >
              {funding ? "Requesting…" : "Get test XLM"}
            </button>
          </div>

          {notice && (
            <p
              role={notice.kind === "err" ? "alert" : "status"}
              className={`mt-4 border-l-2 py-1 pl-3 text-xs ${
                notice.kind === "err" ? "border-short text-short" : "border-long text-long"
              }`}
            >
              {notice.text}
            </p>
          )}
        </div>

        <dl className="microlabel h-fit divide-y divide-hairline border border-hairline text-dim">
          {[
            ["Network", "Testnet"],
            ["Type", "Smart account"],
            ["Signer", "Passkey"],
            ["Fees", "RPC · deployer"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-3 py-2.5">
              <dt>{k}</dt>
              <dd className="text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <p className="microlabel border-b border-hairline pb-3 text-dim">02 · Contract</p>
        <div className="mt-4 border border-hairline bg-surface px-4 py-3">
          <p className="tnum text-xs break-all text-fg sm:text-sm">{address}</p>
        </div>
        <div className="microlabel mt-3 flex flex-wrap gap-5">
          <button
            type="button"
            onClick={() => void copy()}
            className="text-dim transition-colors hover:text-fg"
          >
            {copied ? "✓ Copied" : "Copy address"}
          </button>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-dim transition-colors hover:text-long"
            >
              stellar.expert ↗
            </a>
          )}
        </div>
        <p className="mt-4 max-w-lg text-xs leading-relaxed text-dim">
          This is a smart-account <span className="text-fg">contract</span>, not a classic
          account — controlled by the passkey on this device.
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
