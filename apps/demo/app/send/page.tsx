"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildTransferTransaction,
  SignTransactionModal,
  toSembolError,
  usePasskeyWallet,
  WalletBalance,
  type AssembledTransaction,
} from "@sembol/passkey-react";
import { RequireWallet } from "../../components/RequireWallet";
import { recordTransaction } from "../../lib/history";

function SendForm() {
  const router = useRouter();
  const { kit, address, config } = usePasskeyWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [transaction, setTransaction] = useState<AssembledTransaction<unknown> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleReview = async () => {
    if (!kit) return;
    setFormError(null);

    const to = recipient.trim();
    if (!/^[GC][A-Z2-7]{55}$/.test(to)) {
      setFormError("Enter a valid Stellar address (G… or C…, 56 characters).");
      return;
    }
    if (!/^\d+(\.\d{1,7})?$/.test(amount.trim()) || Number(amount) <= 0) {
      setFormError("Enter a positive XLM amount (up to 7 decimal places).");
      return;
    }

    setBuilding(true);
    try {
      const tx = await buildTransferTransaction(kit, {
        tokenContract: config.nativeTokenContract,
        to,
        amount: amount.trim(),
      });
      setTransaction(tx);
      setModalOpen(true);
    } catch (err) {
      setFormError(toSembolError(err).userMessage);
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Send XLM</h1>
        <span className="text-sm text-slate-500">
          Balance: <WalletBalance showRefresh={false} />
        </span>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleReview();
        }}
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/60 p-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Recipient
          <input
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="G… or C… address"
            spellCheck={false}
            autoComplete="off"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-900"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Amount (XLM)
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="1.5"
            inputMode="decimal"
            autoComplete="off"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-900"
          />
        </label>

        {formError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {formError}
          </p>
        )}

        <button type="submit" disabled={building} className="sembol-btn sembol-btn--primary">
          {building ? "Simulating…" : "Review & sign"}
        </button>
        <p className="text-xs text-slate-500">
          You'll see a summary and approve with your passkey — nothing is sent until you approve.
        </p>
      </form>

      <SignTransactionModal
        open={modalOpen}
        transaction={transaction}
        title="Approve payment"
        description={`Send ${amount || "?"} XLM on Stellar testnet`}
        onClose={() => setModalOpen(false)}
        onSuccess={(result) => {
          if (address) {
            recordTransaction(address, {
              hash: result.hash,
              kind: "send",
              amount: amount.trim(),
              to: recipient.trim(),
            });
          }
          setModalOpen(false);
          router.push("/history");
        }}
      />
    </div>
  );
}

export default function SendPage() {
  return (
    <RequireWallet>
      <SendForm />
    </RequireWallet>
  );
}
