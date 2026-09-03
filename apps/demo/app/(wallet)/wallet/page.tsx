"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RecoverySetup,
  useCreateWallet,
  usePasskeyWallet,
  type CreateWalletPhase,
} from "@sembol/passkey-react";
import { FaceIdIcon, KeyIcon, RefreshIcon, ShieldIcon } from "../../../components/icons";
import { toast } from "../../../components/Toast";
import { recordTransaction } from "../../../lib/history";

const STEPS: { phase: Exclude<CreateWalletPhase, null>; label: string }[] = [
  { phase: "passkey", label: "Create your passkey" },
  { phase: "deploying", label: "Deploy the smart account" },
  { phase: "funding", label: "Add free test XLM" },
];

const REASSURANCE = [
  {
    icon: KeyIcon,
    title: "Your key stays with you",
    body: "It is created inside this device's secure chip and never leaves it.",
  },
  {
    icon: ShieldIcon,
    title: "A real on-chain account",
    body: "An audited OpenZeppelin smart account contract, owned by your passkey.",
  },
  {
    icon: RefreshIcon,
    title: "Recoverable later",
    body: "Add backup passkeys and a recovery credential from the Security page.",
  },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { status, isConnected, capabilities } = usePasskeyWallet();
  const { createWallet, status: createStatus, phase } = useCreateWallet();
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
    } catch (err) {
      toast("err", (err as { userMessage?: string }).userMessage ?? "Wallet creation failed");
    }
  };

  return (
    <div className="grid gap-10 py-4 lg:grid-cols-[1fr_300px] lg:gap-14">
      <section>
        <p className="microlabel text-gold">New wallet · Stellar testnet</p>
        <h1 className="font-display mt-4 max-w-xl text-4xl leading-[1.06] font-semibold tracking-tight text-balance uppercase sm:text-5xl">
          Create your wallet with a look
        </h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-dim">
          Face ID, Touch ID, or Windows Hello becomes the key. Free test XLM is included,
          and your first payment is a minute away.
        </p>

        <div className="card mt-9 max-w-lg p-6 sm:p-7">
          <label className="flex flex-col gap-2.5">
            <span className="text-sm font-medium">
              Wallet name{" "}
              <span className="font-normal text-faint">· shown in your passkey manager</span>
            </span>
            <input
              value={walletName}
              onChange={(event) => setWalletName(event.target.value)}
              placeholder="my-wallet"
              maxLength={40}
              disabled={creating}
              autoComplete="off"
              spellCheck={false}
              className="input-field tnum"
            />
          </label>

          {/* Creation sequence - lights up phase by phase while creating */}
          <ol className="mt-5 flex flex-col gap-2" aria-label="Creation steps">
            {STEPS.map((step, index) => {
              const done = creating && phaseIndex > index;
              const active = creating && phaseIndex === index;
              return (
                <li
                  key={step.phase}
                  className={`flex items-center gap-3.5 rounded-xl border px-4 py-3 transition-colors ${
                    active
                      ? "border-gold/40 bg-gold/8 text-fg"
                      : done
                        ? "border-hairline text-fg"
                        : "border-hairline/60 text-faint"
                  }`}
                >
                  <span
                    className={`tnum grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[11px] ${
                      done
                        ? "border-mint/50 text-mint"
                        : active
                          ? "border-gold/60 text-gold"
                          : "border-hairline text-faint"
                    }`}
                  >
                    {done ? "✓" : index + 1}
                  </span>
                  <span className="text-sm">{step.label}</span>
                  {active && (
                    <span aria-hidden className="pulse-dot ml-auto h-2 w-2 rounded-full bg-gold" />
                  )}
                </li>
              );
            })}
          </ol>

          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating || status === "initializing" || unsupported}
            className="btn-gold mt-6 h-13 w-full text-base"
          >
            {creating ? (
              "Working…"
            ) : (
              <>
                <FaceIdIcon size={20} />
                Create wallet
              </>
            )}
          </button>

          <p className="mt-4 text-center text-sm text-faint">
            Already have one? Press <span className="text-dim">Connect</span> in the top right.
          </p>

          {unsupported && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn"
            >
              This browser doesn&apos;t support passkeys. Try a recent Chrome, Safari, Edge,
              or Firefox.
            </p>
          )}
        </div>

        <details className="group mt-7 max-w-lg">
          <summary className="cursor-pointer list-none text-sm text-dim transition-colors hover:text-fg">
            <span aria-hidden className="mr-1.5 text-gold">↺</span>
            Lost your device? Recover access
          </summary>
          <div className="card mt-3 p-5">
            <RecoverySetup
              mode="recover"
              onRecovered={() => {
                toast("ok", "Wallet recovered - welcome back");
                router.push("/dashboard");
              }}
              onError={(error) => toast("err", error.userMessage)}
            />
          </div>
        </details>

        <details className="group mt-4 max-w-lg">
          <summary className="cursor-pointer list-none text-sm text-dim transition-colors hover:text-fg">
            <span aria-hidden className="mr-1.5 text-gold">?</span>
            Connect can&apos;t find your passkey · read this
          </summary>
          <div className="card mt-3 flex flex-col gap-3 p-5 text-sm leading-relaxed text-dim">
            <p>
              <span className="font-medium text-fg">Passkeys are per-domain.</span> A wallet
              created on <code className="font-mono text-fg">localhost</code> (or any other
              site) will never show up here. Create one on this domain once, and Connect will
              find it from then on.
            </p>
            <p>
              <span className="font-medium text-fg">Chrome + Apple Passwords:</span> Chrome
              only lists passkeys stored in iCloud Keychain when{" "}
              <code className="font-mono text-fg">
                chrome://password-manager/settings → &quot;Use passkeys and passwords from
                iCloud Keychain&quot;
              </code>{" "}
              is enabled. Saving works without it, listing doesn&apos;t. Or just use Safari,
              which reads them natively.
            </p>
          </div>
        </details>
      </section>

      <aside className="flex flex-col gap-4 lg:pt-24" aria-label="What you get">
        {REASSURANCE.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card p-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold/12 text-gold">
              <Icon size={18} />
            </span>
            <h2 className="mt-3.5 text-[15px] font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-dim">{body}</p>
          </div>
        ))}
      </aside>
    </div>
  );
}
