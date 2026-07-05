"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreateWalletButton, usePasskeyWallet } from "@sembol/passkey-react";
import { recordTransaction } from "../lib/history";

const FEATURES = [
  {
    title: "No seed phrases",
    body: "Your wallet is secured by a passkey — Face ID, Touch ID, or Windows Hello. Nothing to write down, nothing to lose.",
  },
  {
    title: "A real smart account",
    body: "Every wallet is an audited OpenZeppelin smart-account contract on Stellar, unlocking policies, multiple signers, and recovery.",
  },
  {
    title: "Free to try",
    body: "Everything runs on Stellar testnet with free XLM from Friendbot. Create, fund, and send in under a minute.",
  },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { status, isConnected, capabilities, error } = usePasskeyWallet();

  useEffect(() => {
    if (isConnected) router.push("/dashboard");
  }, [isConnected, router]);

  const unsupported = capabilities !== null && !capabilities.supported;

  return (
    <div className="flex flex-col gap-10">
      <section className="pt-8 text-center">
        <p className="mb-3 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700 uppercase dark:bg-indigo-950 dark:text-indigo-300">
          Stellar testnet demo
        </p>
        <h1 className="mx-auto max-w-xl text-4xl font-bold tracking-tight text-balance">
          A Stellar wallet with <span className="text-indigo-600 dark:text-indigo-400">no seed phrase</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-slate-600 dark:text-slate-400">
          Create a smart wallet with your fingerprint or face, receive test XLM, and send your
          first payment — all in your browser.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <CreateWalletButton
            userName="demo-user"
            label="Create your wallet"
            onSuccess={({ contractId }) => {
              recordTransaction(contractId, { hash: "", kind: "create" });
              router.push("/dashboard");
            }}
          />
          <p className="text-xs text-slate-500">
            Already have one? Use <em>Connect wallet</em> in the top right.
          </p>
        </div>

        {unsupported && (
          <p
            role="alert"
            className="mx-auto mt-6 max-w-md rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
          >
            This browser doesn't support passkeys. Try a recent version of Chrome, Safari, Edge,
            or Firefox.
          </p>
        )}
        {error && !unsupported && (
          <p
            role="alert"
            className="mx-auto mt-6 max-w-md rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          >
            {error.userMessage}
          </p>
        )}
        {status === "initializing" && (
          <p className="mt-6 text-sm text-slate-500">Checking for an existing session…</p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map(({ title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-200 bg-white/60 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60"
          >
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
