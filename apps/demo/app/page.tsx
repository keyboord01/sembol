"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateWallet, usePasskeyWallet, type CreateWalletPhase } from "@sembol/passkey-react";
import { ScrambleText } from "../components/ScrambleText";
import { recordTransaction } from "../lib/history";

const STEPS: { phase: Exclude<CreateWalletPhase, null>; label: string }[] = [
  { phase: "passkey", label: "Create passkey" },
  { phase: "deploying", label: "Deploy contract" },
  { phase: "funding", label: "Fund via Friendbot" },
];

const SPECS = [
  {
    n: "01",
    title: "No seed phrases",
    body: "The wallet is a passkey — Face ID, Touch ID, Windows Hello. Nothing to write down, nothing to lose.",
  },
  {
    n: "02",
    title: "A real smart account",
    body: "Every wallet is an audited OpenZeppelin contract on Stellar: policies, multiple signers, recovery.",
  },
  {
    n: "03",
    title: "Free to try",
    body: "Runs on testnet with free XLM from Friendbot. Create, fund, and send in under a minute.",
  },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { status, isConnected, capabilities } = usePasskeyWallet();
  const { createWallet, status: createStatus, phase, error } = useCreateWallet();
  const [walletName, setWalletName] = useState("");

  useEffect(() => {
    // replace, not push: Back must not bounce connected users to onboarding.
    if (isConnected && createStatus !== "creating") router.replace("/dashboard");
  }, [isConnected, createStatus, router]);

  const unsupported = capabilities !== null && !capabilities.supported;
  const creating = createStatus === "creating";
  const phaseIndex = phase ? STEPS.findIndex((step) => step.phase === phase) : -1;

  const handleCreate = async () => {
    const name = walletName.trim() || "Sembol wallet";
    try {
      const created = await createWallet({ userName: name, nickname: name });
      recordTransaction(created.contractId, { hash: "", kind: "create" });
      router.replace("/dashboard");
    } catch {
      // error state rendered below
    }
  };

  return (
    <div className="flex flex-col gap-14">
      <section className="pt-8">
        <p className="microlabel text-dim">
          01 · Onboarding <span className="text-long">· Stellar testnet</span>
        </p>
        <h1 className="font-display mt-4 max-w-2xl text-4xl leading-tight font-semibold tracking-tight uppercase sm:text-5xl">
          <ScrambleText text="A wallet with" />
          <br />
          <span className="text-long">
            <ScrambleText text="no seed phrase" speed={32} />
          </span>
        </h1>
        <p className="mt-5 max-w-md text-sm text-dim">
          Create a smart wallet with your fingerprint or face, receive test XLM, and send your
          first payment — all in the browser.
        </p>

        <div className="mt-8 max-w-md">
          <label className="flex flex-col gap-2">
            <span className="microlabel text-dim">
              Wallet name <span className="normal-case">— shown in your passkey manager</span>
            </span>
            <input
              value={walletName}
              onChange={(event) => setWalletName(event.target.value)}
              placeholder="e.g. ahmed·main"
              maxLength={40}
              disabled={creating}
              autoComplete="off"
              spellCheck={false}
              className="h-10 border border-hairline bg-surface px-3 text-sm text-fg placeholder:text-dim/60 focus:border-long focus:outline-none"
            />
          </label>

          {/* Deployment sequence — lights up phase by phase while creating */}
          <ol className="mt-4 divide-y divide-hairline border border-hairline" aria-label="Creation steps">
            {STEPS.map((step, index) => {
              const done = creating && phaseIndex > index;
              const active = creating && phaseIndex === index;
              return (
                <li
                  key={step.phase}
                  className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                    active ? "bg-surface text-fg" : done ? "text-fg" : "text-dim"
                  }`}
                >
                  <span className={`microlabel tnum ${done || active ? "text-long" : ""}`}>
                    {done ? "✓" : `0${index + 1}`}
                  </span>
                  <span className="microlabel">{step.label}</span>
                  {active && (
                    <span aria-hidden className="ml-auto h-1.5 w-1.5 animate-pulse bg-long" />
                  )}
                </li>
              );
            })}
          </ol>

          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating || status === "initializing" || unsupported}
            className="microlabel mt-4 h-11 w-full border border-long bg-long font-medium text-ink transition-colors hover:bg-transparent hover:text-long disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? "Working…" : "Create wallet →"}
          </button>

          <p className="microlabel mt-3 text-dim">
            Already have one? Connect wallet, top right.
          </p>

          {unsupported && (
            <p
              role="alert"
              className="mt-4 border-l-2 border-amber py-1 pl-3 text-xs text-amber"
            >
              This browser doesn't support passkeys. Try a recent Chrome, Safari, Edge, or
              Firefox.
            </p>
          )}
          {error && !unsupported && !creating && (
            <p
              role="alert"
              className="mt-4 border-l-2 border-short py-1 pl-3 text-xs text-short"
            >
              {error.userMessage}
            </p>
          )}
        </div>
      </section>

      <section aria-label="Why Sembol">
        <p className="microlabel border-b border-hairline pb-3 text-dim">02 · Spec</p>
        <div className="grid sm:grid-cols-3">
          {SPECS.map(({ n, title, body }) => (
            <div
              key={n}
              className="group border-b border-hairline px-0 py-5 sm:border-r sm:border-b-0 sm:px-5 sm:first:pl-0 sm:last:border-r-0"
            >
              <p className="microlabel tnum text-long">{n}</p>
              <h2 className="font-display mt-2 text-sm font-semibold tracking-wide uppercase">
                {title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-dim transition-colors group-hover:text-fg">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
