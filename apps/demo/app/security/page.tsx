"use client";

import {
  AddSignerButton,
  RecoverySetup,
  SignerList,
  SpendingPolicyForm,
  useSigners,
  type SembolError,
} from "@sembol/passkey-react";
import { RequireWallet } from "../../components/RequireWallet";
import { toast } from "../../components/Toast";

function Security() {
  const { signers } = useSigners();
  const showError = (error: SembolError) => toast("err", error.userMessage);

  return (
    <div className="flex flex-col gap-12">
      <div className="flex items-baseline justify-between border-b border-hairline pb-4">
        <p className="microlabel text-dim">01 · Signers</p>
        <p className="microlabel tnum text-dim">
          {signers.length} active signer{signers.length === 1 ? "" : "s"}
        </p>
      </div>

      <section className="flex flex-col gap-5">
        <p className="max-w-xl text-sm leading-relaxed text-dim">
          Every signer below can approve transactions from this wallet. Add a second device or a
          backup key so a lost phone is not a lost wallet.
        </p>
        <SignerList
          onRemoved={() => toast("ok", "Signer removed")}
          onError={showError}
        />
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
      </section>

      <p className="microlabel border-b border-hairline pb-4 text-dim">02 · Recovery</p>

      <section className="flex flex-col gap-5">
        <p className="max-w-xl text-sm leading-relaxed text-dim">
          Enroll a recovery credential now, while you still have this device. To get back in later,
          open this site on any device and use Recover on the landing page.
        </p>
        <div className="max-w-xl">
          <RecoverySetup
            onEnrolled={() => toast("ok", "Recovery credential enrolled")}
            onError={showError}
          />
        </div>
      </section>

      <p className="microlabel border-b border-hairline pb-4 text-dim">03 · Spending limit</p>

      <section className="flex flex-col gap-5">
        <p className="max-w-xl text-sm leading-relaxed text-dim">
          Cap how much XLM this wallet can send per window. Payments beyond the cap are rejected
          on-chain by the spending-limit policy contract.
        </p>
        <div className="max-w-xl">
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
