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
import { QrIcon, SendIcon } from "../../../components/icons";
import { QrScanner } from "../../../components/QrScanner";
import { RequireWallet } from "../../../components/RequireWallet";
import { toast } from "../../../components/Toast";
import { recordTransaction } from "../../../lib/history";

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
    <div className="mx-auto flex max-w-xl flex-col gap-7 py-2">
      <div>
        <p className="microlabel text-gold">Send</p>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight uppercase">
            Send XLM
          </h1>
          <p className="tnum text-sm text-dim">
            Balance{" "}
            <span className="font-medium text-fg">
              {balanceStatus === "success" ? formatted : "…"}
            </span>{" "}
            XLM
          </p>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleReview();
        }}
        className="card flex flex-col gap-6 p-6 sm:p-7"
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label htmlFor="recipient" className="text-sm font-medium">
              Recipient <span className="font-normal text-faint">(G… or C… address)</span>
            </label>
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="chip transition-colors hover:border-gold/50 hover:text-gold"
            >
              <QrIcon size={13} />
              Scan QR
            </button>
          </div>
          <input
            id="recipient"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="GAAH4OT3…"
            spellCheck={false}
            autoComplete="off"
            className="input-field tnum font-mono text-sm"
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
          <span className="text-sm font-medium">
            Amount <span className="font-normal text-faint">· XLM</span>
          </span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="1.5"
            inputMode="decimal"
            autoComplete="off"
            className="input-field tnum"
          />
          <span className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => setAmount(quick)}
                className="chip tnum transition-colors hover:border-gold/50 hover:text-gold"
              >
                {quick}
              </button>
            ))}
            <button
              type="button"
              onClick={setMax}
              disabled={raw === null}
              className="chip transition-colors hover:border-gold/50 hover:text-gold disabled:opacity-40"
            >
              Max
            </button>
          </span>
        </label>

        {formError && (
          <p
            role="alert"
            className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {formError}
          </p>
        )}

        <div>
          <button type="submit" disabled={building} className="btn-gold h-13 w-full text-base">
            {building ? (
              "Simulating…"
            ) : (
              <>
                <SendIcon size={18} />
                Review &amp; sign
              </>
            )}
          </button>
          <p className="mt-3.5 text-center text-sm text-faint">
            Nothing is sent until you approve with your passkey.
          </p>
        </div>
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
