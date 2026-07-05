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

function Playground() {
  const { kit, status, isConnected, config, fund } = usePasskeyWallet();
  const { address, displayAddress, explorerUrl, copy, copied } = useWalletAddress();
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
    <div className="sembol-story-stack" style={{ minWidth: 420 }}>
      <div className="sembol-story-card">
        <h3 style={{ marginTop: 0 }}>1 · Create or connect</h3>
        <p className="sembol-story-note">
          Creates a real passkey and deploys a real smart-account contract on Stellar testnet
          (auto-funded with test XLM by Friendbot).
        </p>
        <div className="sembol-story-row">
          <CreateWalletButton userName="storybook-visitor" />
          <ConnectWalletButton />
        </div>
        <p className="sembol-story-note">status: {status}</p>
      </div>

      {isConnected && (
        <div className="sembol-story-card">
          <h3 style={{ marginTop: 0 }}>2 · Your wallet</h3>
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
          <div className="sembol-story-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="sembol-btn sembol-btn--secondary"
              onClick={() => void handleFund()}
              disabled={busy}
            >
              Get test XLM (Friendbot)
            </button>
          </div>
        </div>
      )}

      {isConnected && (
        <div className="sembol-story-card">
          <h3 style={{ marginTop: 0 }}>3 · Send a payment</h3>
          <div className="sembol-story-stack">
            <input
              className="sembol-story-input"
              placeholder={`Recipient (G… or C…) — empty = send to yourself`}
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
          <h3 style={{ marginTop: 0 }}>Transactions this session</h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.8125rem" }}>
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
