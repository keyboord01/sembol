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
import { toast } from "../../components/Toast";
import { recordTransaction } from "../../lib/history";

function Dashboard() {
  const { fund, address } = usePasskeyWallet();
  const { explorerUrl, copy, copied } = useWalletAddress();
  const { formatted, symbol, status: balanceStatus, isRefreshing, refetch } = useWalletBalance();
  const [funding, setFunding] = useState(false);

  const handleFund = async () => {
    setFunding(true);
    try {
      const result = await fund();
      toast("ok", `Received ${result.amount ?? "test"} XLM from Friendbot`);
      if (address && result.hash) {
        recordTransaction(address, { hash: result.hash, kind: "fund" });
      }
    } catch (err) {
      toast("err", toSembolError(err).userMessage);
    } finally {
      setFunding(false);
    }
  };

  return (
    <div className="flex flex-col gap-12">
      <p className="microlabel border-b border-hairline pb-4 text-dim">01 · Account</p>

      <section className="grid gap-10 md:grid-cols-[1fr_280px]">
        <div>
          <p className="microlabel text-dim">Available balance</p>
          <p className="font-display tnum mt-3 text-7xl font-semibold tracking-tight">
            {balanceStatus === "success" ? (
              <>
                {formatted}
                <span className="ml-3 text-xl text-dim">{symbol}</span>
              </>
            ) : balanceStatus === "error" ? (
              <span className="text-3xl text-short">unavailable</span>
            ) : (
              <span className="text-dim">·····</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isRefreshing}
            className="microlabel mt-3 text-dim transition-colors hover:text-fg disabled:opacity-40"
          >
            {isRefreshing ? "Refreshing…" : "↻ Refresh"}
          </button>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/send"
              className="inline-flex h-12 items-center border border-long bg-long px-6 font-mono text-sm font-semibold tracking-[0.1em] text-ink uppercase transition-colors hover:bg-transparent hover:text-long"
            >
              Send payment →
            </Link>
            <button
              type="button"
              onClick={() => void handleFund()}
              disabled={funding}
              className="inline-flex h-12 items-center border border-hairline px-6 font-mono text-sm tracking-[0.1em] text-fg uppercase transition-colors hover:border-long hover:text-long disabled:cursor-not-allowed disabled:opacity-40"
            >
              {funding ? "Requesting…" : "Get test XLM"}
            </button>
          </div>
        </div>

        <dl className="h-fit divide-y divide-hairline border border-hairline">
          {[
            ["Network", "Testnet"],
            ["Type", "Smart account"],
            ["Signer", "Passkey"],
            ["Fees", "RPC · deployer"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <dt className="microlabel text-dim">{k}</dt>
              <dd className="microlabel text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <p className="microlabel border-b border-hairline pb-4 text-dim">02 · Contract</p>
        <div className="mt-5 border border-hairline bg-surface px-5 py-4">
          <p className="tnum text-sm break-all text-fg sm:text-base">{address}</p>
        </div>
        <div className="microlabel mt-4 flex flex-wrap gap-6">
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
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-dim">
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
