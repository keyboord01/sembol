"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildTransferTransaction,
  SignTransactionModal,
  toSembolError,
  usePasskeyWallet,
  useWalletBalance,
  type AssembledTransaction,
} from "@sembol/passkey-react";
import { QrScanner } from "../../components/QrScanner";
import { RequireWallet } from "../../components/RequireWallet";
import { toast } from "../../components/Toast";
import { recordTransaction } from "../../lib/history";

const QUICK_AMOUNTS = ["1", "10", "100"] as const;

function SendForm() {
  const router = useRouter();
  const { kit, address, config } = usePasskeyWallet();
  const { raw, formatted, status: balanceStatus } = useWalletBalance();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [transaction, setTransaction] = useState<AssembledTransaction<unknown> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [scanning, setScanning] = useState(false);

  const setMax = () => {
    if (raw === null) return;
    // Leave a small buffer for fees.
    const spendable = Number(raw) / 1e7 - 0.5;
    setAmount(spendable > 0 ? String(Math.floor(spendable * 100) / 100) : "0");
  };

  const handleReview = async () => {
    if (!kit) return;
    setFormError(null);

    const to = recipient.trim();
    if (!/^[GC][A-Z2-7]{55}$/.test(to)) {
      setFormError("Enter a valid Stellar address (G… or C…, 56 characters).");
      return;
    }
    if (!/^\d*(\.\d{1,7})?$/.test(amount.trim()) || !(Number(amount) > 0)) {
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
      // System/simulation failures toast; field validation stays inline.
      toast("err", toSembolError(err).userMessage);
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-10">
      <div className="flex items-baseline justify-between border-b border-hairline pb-4">
        <p className="microlabel text-dim">01 · Send XLM</p>
        <p className="microlabel tnum text-dim">
          Balance{" "}
          <span className="text-fg">{balanceStatus === "success" ? formatted : "-"}</span> XLM
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleReview();
        }}
        className="flex flex-col gap-7"
      >
        <div className="flex flex-col gap-2.5">
          <div className="microlabel flex items-center justify-between text-dim">
            <label htmlFor="recipient">Recipient (G… or C… address)</label>
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="border border-hairline px-3 py-1 transition-colors hover:border-long hover:text-long"
            >
              ▦ Scan QR
            </button>
          </div>
          <input
            id="recipient"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="GAAH4OT3…"
            spellCheck={false}
            autoComplete="off"
            className="tnum h-13 border border-hairline bg-surface px-4 text-base text-fg placeholder:text-dim/50 focus:border-long focus:outline-none"
          />
        </div>

        {scanning && (
          <QrScanner
            onResult={(scanned) => {
              setRecipient(scanned);
              setScanning(false);
              toast("ok", "Address scanned");
            }}
            onClose={() => setScanning(false)}
          />
        )}

        <label className="flex flex-col gap-2.5">
          <span className="microlabel text-dim">Amount - XLM</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="1.5"
            inputMode="decimal"
            autoComplete="off"
            className="tnum h-13 border border-hairline bg-surface px-4 text-base text-fg placeholder:text-dim/50 focus:border-long focus:outline-none"
          />
          <span className="microlabel flex gap-2 text-dim">
            {QUICK_AMOUNTS.map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => setAmount(quick)}
                className="border border-hairline px-3 py-1 transition-colors hover:border-long hover:text-long"
              >
                {quick}
              </button>
            ))}
            <button
              type="button"
              onClick={setMax}
              disabled={raw === null}
              className="border border-hairline px-3 py-1 transition-colors hover:border-long hover:text-long disabled:opacity-40"
            >
              Max
            </button>
          </span>
        </label>

        {formError && (
          <p role="alert" className="border-l-2 border-short py-1 pl-3 text-sm text-short">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={building}
          className="h-13 border border-long bg-long font-mono text-sm font-semibold tracking-[0.1em] text-ink uppercase transition-colors hover:bg-transparent hover:text-long disabled:cursor-not-allowed disabled:opacity-40"
        >
          {building ? "Simulating…" : "Review & sign →"}
        </button>
        <p className="microlabel -mt-3 text-dim">
          Nothing is sent until you approve with your passkey.
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
