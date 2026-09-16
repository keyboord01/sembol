"use client";

import { useState } from "react";
import Link from "next/link";
import {
  toSembolError,
  usePasskeyWallet,
  useWalletAddress,
  useWalletBalance,
} from "@sembol/passkey-react";
import {
  ArrowUpRightIcon,
  BoltIcon,
  CheckIcon,
  CopyIcon,
  QrIcon,
  RefreshIcon,
  SendIcon,
} from "../../../components/icons";
import { ReceiveQr } from "../../../components/ReceiveQr";
import { RequireWallet } from "../../../components/RequireWallet";
import { toast } from "../../../components/Toast";
import { recordTransaction } from "../../../lib/history";

function facts(network: string): [string, string][] {
  const isMain = /public|mainnet/i.test(network);
  return [
    ["Network", isMain ? "Mainnet" : "Testnet"],
    ["Type", "Smart account"],
    ["Signer", "Passkey"],
    ["Creation fees", "Sponsored"],
  ];
}

function Dashboard() {
  const { fund, address, config } = usePasskeyWallet();
  const isMainnet = /public|mainnet/i.test(config.networkPassphrase ?? "");
  const { explorerUrl, copy, copied } = useWalletAddress();
  const { formatted, symbol, status: balanceStatus, isRefreshing, refetch } = useWalletBalance();
  const [funding, setFunding] = useState(false);
  const [fundStep, setFundStep] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const handleFund = async () => {
    setFunding(true);
    setFundStep("Requesting XLM from Friendbot…");
    // The provider emits funding:start then tx:submitted; reflect the wait.
    const stepTimer = setTimeout(
      () => setFundStep("Waiting for the deposit to confirm on-chain…"),
      2500,
    );
    try {
      const result = await fund();
      toast("ok", `Received ${result.amount ?? "test"} XLM from Friendbot`);
      if (address && result.hash) {
        recordTransaction(address, { hash: result.hash, kind: "fund" });
      }
    } catch (err) {
      const sembolError = toSembolError(err);
      // "Already funded" is information, not a failure.
      toast(sembolError.code === "already_funded" ? "ok" : "err", sembolError.userMessage);
    } finally {
      clearTimeout(stepTimer);
      setFunding(false);
      setFundStep(null);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* ---------- balance hero ---------- */}
      <section className="card relative overflow-hidden bg-gradient-to-b from-raised to-surface p-7 sm:p-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-28 -right-20 h-64 w-64 rounded-full bg-gold/8 blur-3xl"
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-4">
            <p className="microlabel text-dim">Available balance</p>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isRefreshing}
              className="chip transition-colors hover:border-gold/50 hover:text-gold disabled:opacity-40"
            >
              <RefreshIcon size={13} className={isRefreshing ? "animate-spin" : undefined} />
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <p className="font-display tnum mt-4 text-5xl font-semibold tracking-tight sm:text-7xl">
            {balanceStatus === "success" ? (
              <>
                {formatted}
                <span className="ml-3 text-xl font-medium text-dim">{symbol}</span>
              </>
            ) : balanceStatus === "error" ? (
              <span className="text-2xl text-danger sm:text-3xl">unavailable</span>
            ) : (
              <span className="text-dim">·····</span>
            )}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/send" className="btn-gold h-12 px-7">
              <SendIcon size={17} />
              Send
            </Link>
            <button
              type="button"
              onClick={() => setShowQr((open) => !open)}
              aria-expanded={showQr}
              className="btn-ghost h-12 px-6"
            >
              <QrIcon size={17} />
              {showQr ? "Hide QR" : "Receive"}
            </button>
            {!isMainnet && (
              <button
                type="button"
                onClick={() => void handleFund()}
                disabled={funding}
                className="btn-ghost h-12 px-6"
              >
                <BoltIcon size={17} />
                {funding ? "Working…" : "Get test XLM"}
              </button>
            )}
          </div>

          {fundStep && (
            <p className="mt-4 flex items-center gap-2.5 text-sm text-dim" role="status">
              <span aria-hidden className="pulse-dot h-2 w-2 rounded-full bg-gold" />
              {fundStep}
            </p>
          )}
        </div>
      </section>

      {showQr && address && (
        <section className="card p-6" aria-label="Receive">
          <ReceiveQr address={address} />
        </section>
      )}

      {/* ---------- facts ---------- */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Account facts">
        {facts(config.networkPassphrase ?? "").map(([k, v]) => (
          <div key={k} className="card px-4 py-3.5">
            <p className="microlabel text-faint">{k}</p>
            <p className="mt-1 text-sm font-medium">{v}</p>
          </div>
        ))}
      </section>

      {/* ---------- address ---------- */}
      <section className="card p-6 sm:p-7">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold">Wallet address</h2>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-dim transition-colors hover:text-gold"
            >
              stellar.expert <ArrowUpRightIcon size={13} />
            </a>
          )}
        </div>
        <div className="mt-4 rounded-xl border border-hairline bg-ink px-4 py-3.5">
          <p className="tnum font-mono text-sm break-all text-fg">{address}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void copy()}
            className="chip transition-colors hover:border-gold/50 hover:text-gold"
          >
            {copied ? <CheckIcon size={13} className="text-mint" /> : <CopyIcon size={13} />}
            {copied ? "Copied" : "Copy address"}
          </button>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-dim">
          This is a smart-account <span className="text-fg">contract</span>, not a classic
          account. It is controlled by the passkey on this device.
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
