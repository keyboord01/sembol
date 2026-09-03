"use client";

import {
  AddSignerButton,
  RecoverySetup,
  SignerList,
  SpendingPolicyForm,
  useSigners,
  type SembolError,
} from "@sembol/passkey-react";
import { CoinsIcon, KeyIcon, RefreshIcon } from "../../../components/icons";
import { RequireWallet } from "../../../components/RequireWallet";
import { toast } from "../../../components/Toast";

function Security() {
  const { signers } = useSigners();
  const showError = (error: SembolError) => toast("err", error.userMessage);

  return (
    <div className="flex flex-col gap-7 py-2">
      <div>
        <p className="microlabel text-gold">Security</p>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight uppercase">
            Keys &amp; limits
          </h1>
          <p className="tnum text-sm text-dim">
            {signers.length} active signer{signers.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <section className="card p-6 sm:p-7" aria-label="Signers">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold/12 text-gold">
            <KeyIcon size={19} />
          </span>
          <div>
            <h2 className="font-semibold">Signers</h2>
            <p className="text-sm text-dim">Every key that can approve payments</p>
          </div>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-dim">
          Add a second device or a backup key so a lost phone is not a lost wallet.
        </p>
        <div className="mt-5 flex flex-col gap-5">
          <SignerList onRemoved={() => toast("ok", "Signer removed")} onError={showError} />
          <div>
            <AddSignerButton
              variant="outline"
              onAdded={({ method }) =>
                toast(
                  "ok",
                  method === "passkey" ? "New passkey added as a signer" : "Signer added",
                )
              }
              onError={showError}
            />
          </div>
        </div>
      </section>

      <section className="card p-6 sm:p-7" aria-label="Recovery">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold/12 text-gold">
            <RefreshIcon size={19} />
          </span>
          <div>
            <h2 className="font-semibold">Recovery</h2>
            <p className="text-sm text-dim">Get back in from any device</p>
          </div>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-dim">
          Enroll a recovery credential now, while you still have this device. To get back in
          later, open this site anywhere and use Recover on the create-wallet page.
        </p>
        <div className="mt-5 max-w-xl">
          <RecoverySetup
            onEnrolled={() => toast("ok", "Recovery credential enrolled")}
            onError={showError}
          />
        </div>
      </section>

      <section className="card p-6 sm:p-7" aria-label="Spending limit">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold/12 text-gold">
            <CoinsIcon size={19} />
          </span>
          <div>
            <h2 className="font-semibold">Spending limit</h2>
            <p className="text-sm text-dim">A hard cap, enforced on-chain</p>
          </div>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-dim">
          Cap how much XLM this wallet can send per window. Payments beyond the cap are
          rejected on-chain by the spending-limit policy contract.
        </p>
        <div className="mt-5 max-w-xl">
          <SpendingPolicyForm
            onChanged={() => toast("ok", "Spending limit updated")}
            onError={showError}
          />
        </div>
      </section>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <RequireWallet>
      <Security />
    </RequireWallet>
  );
}
