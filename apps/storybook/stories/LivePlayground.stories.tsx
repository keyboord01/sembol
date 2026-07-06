import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  buildTransferTransaction,
  ConnectWalletButton,
  CreateWalletButton,
  SignTransactionModal,
  toSembolError,
  usePasskeyWallet,
  useWalletAddress,
  WalletBalance,
  type AssembledTransaction,
} from "@sembol/passkey-react";

function StatusPill() {
  const { status } = usePasskeyWallet();
  return (
    <span className="sembol-story-pill" data-on={status === "connected"}>
      <span className="sembol-story-pill__dot" aria-hidden />
      {status}
    </span>
  );
}

function Playground() {
  const { kit, isConnected, config, fund } = usePasskeyWallet();
  const { address, displayAddress, explorerUrl, copy, copied } = useWalletAddress();
  const [walletName, setWalletName] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("1");
  const [transaction, setTransaction] = useState<AssembledTransaction<unknown> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hashes, setHashes] = useState<string[]>([]);

  const handleFund = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await fund();
      setFeedback(`✓ Funded with ${result.amount ?? "?"} test XLM`);
      if (result.hash) setHashes((h) => [result.hash, ...h]);
    } catch (err) {
      setFeedback(`⚠️ ${toSembolError(err).userMessage}`);
    } finally {
      setBusy(false);
    }
  };

  const handlePrepareSend = async () => {
    if (!kit) return;
    setBusy(true);
    setFeedback(null);
    try {
      const tx = await buildTransferTransaction(kit, {
        tokenContract: config.nativeTokenContract,
        to: recipient.trim() || address!,
        amount,
      });
      setTransaction(tx);
      setModalOpen(true);
    } catch (err) {
      setFeedback(`⚠️ ${toSembolError(err).userMessage}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sembol-story-stack" style={{ maxWidth: 520 }}>
      <div className="sembol-story-card">
        <div className="sembol-story-card__header">
          <span className="sembol-story-card__step">
            <b>01</b> · Create or connect
          </span>
          <StatusPill />
        </div>
        <div className="sembol-story-card__body">
          <p className="sembol-story-note">
            Creates a <strong>real</strong> passkey and deploys a smart-account contract on
            Stellar testnet, funded with free XLM. The name is what your passkey manager
            displays.
          </p>
          <input
            className="sembol-story-input"
            placeholder="Wallet name — e.g. my-first-wallet"
            value={walletName}
            onChange={(event) => setWalletName(event.target.value)}
            maxLength={40}
            aria-label="Wallet name"
          />
          <div className="sembol-story-row">
            <CreateWalletButton
              userName={walletName.trim() || "storybook-visitor"}
              nickname={walletName.trim() || undefined}
            />
            <ConnectWalletButton variant="outline" />
          </div>
        </div>
      </div>

      {isConnected && (
        <div className="sembol-story-card">
          <div className="sembol-story-card__header">
            <span className="sembol-story-card__step">
              <b>02</b> · Your wallet
            </span>
          </div>
          <div className="sembol-story-card__body">
            <dl className="sembol-story-kv">
              <dt>Address</dt>
              <dd>
                {displayAddress}{" "}
                <button type="button" className="sembol-icon-btn" onClick={() => void copy()}>
                  {copied ? "✓" : "⧉"}
                </button>
                {explorerUrl && (
                  <>
                    {" "}
                    <a href={explorerUrl} target="_blank" rel="noreferrer">
                      explorer ↗
                    </a>
                  </>
                )}
              </dd>
              <dt>Balance</dt>
              <dd>
                <WalletBalance />
              </dd>
            </dl>
            <div className="sembol-story-row">
              <button
                type="button"
                className="sembol-btn sembol-btn--secondary"
                onClick={() => void handleFund()}
                disabled={busy}
              >
                Get test XLM
              </button>
            </div>
          </div>
        </div>
      )}

      {isConnected && (
        <div className="sembol-story-card">
          <div className="sembol-story-card__header">
            <span className="sembol-story-card__step">
              <b>03</b> · Send a payment
            </span>
          </div>
          <div className="sembol-story-card__body">
            <input
              className="sembol-story-input"
              placeholder="Recipient (G… or C…) — empty = send to yourself"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              aria-label="Recipient address"
            />
            <input
              className="sembol-story-input"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-label="Amount in XLM"
            />
            <div className="sembol-story-row">
              <button
                type="button"
                className="sembol-btn sembol-btn--primary"
                onClick={() => void handlePrepareSend()}
                disabled={busy}
              >
                {busy ? "Simulating…" : "Review & sign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedback && <p className="sembol-story-note">{feedback}</p>}

      {hashes.length > 0 && (
        <div className="sembol-story-card">
          <div className="sembol-story-card__header">
            <span className="sembol-story-card__step">
              <b>04</b> · Transactions this session
            </span>
          </div>
          <div className="sembol-story-card__body">
            <ul className="sembol-story-txlist">
              {hashes.map((hash) => (
                <li key={hash}>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {hash.slice(0, 8)}…{hash.slice(-8)} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <SignTransactionModal
        open={modalOpen}
        transaction={transaction}
        description={`Send ${amount} XLM on Stellar testnet`}
        onClose={() => setModalOpen(false)}
        onSuccess={(result) => setHashes((h) => [result.hash, ...h])}
      />
    </div>
  );
}

const meta = {
  title: "Live Playground",
  component: Playground,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "**The full wallet lifecycle, live on Stellar testnet, using only published library APIs**: create a passkey wallet → auto-fund via Friendbot → review a transfer in the SignTransactionModal → approve with your passkey → verify the hash on stellar.expert. This is the same flow the reference app ships.",
      },
    },
  },
} satisfies Meta<typeof Playground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CompleteWalletFlow: Story = {};
