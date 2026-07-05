import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  buildTransferTransaction,
  ConnectWalletButton,
  SignTransactionModal,
  toSembolError,
  usePasskeyWallet,
  WalletBalance,
  type AssembledTransaction,
} from "@sembol/passkey-react";

const meta = {
  title: "Components/SignTransactionModal",
  component: SignTransactionModal,
  parameters: {
    docs: {
      description: {
        component: [
          "The approval screen for passkey signing. Renders a human-readable summary of the transaction (contract, function, decoded arguments, max fee, network badge), then drives the full **sign → re-simulate → submit** flow with progress, success (hash + stellar.expert link) and friendly error states.",
          "",
          "```tsx",
          'import { SignTransactionModal, buildTransferTransaction } from "@sembol/passkey-react";',
          "",
          "const tx = await buildTransferTransaction(kit, {",
          "  tokenContract: config.nativeTokenContract,",
          '  to: "G…", amount: "1.5",',
          "});",
          "",
          "<SignTransactionModal",
          "  open={open}",
          "  transaction={tx}",
          '  description="Send 1.5 XLM"',
          "  onClose={() => setOpen(false)}",
          "  onSuccess={({ hash }) => console.log(hash)}",
          "/>",
          "```",
          "",
          "**Live demo:** connect a funded wallet, then *Prepare transaction* builds a real 0.1 XLM self-transfer on testnet and opens the modal. Approving triggers a real passkey prompt and submits on-chain.",
          "",
          "**Accessibility:** `role=dialog` + `aria-modal`, labelled by the title, focus is trapped and restored, Escape/overlay dismiss (disabled while signing), status changes use `role=status` / `role=alert`.",
        ].join("\n"),
      },
    },
  },
} satisfies Meta<typeof SignTransactionModal>;

export default meta;
type Story = StoryObj<typeof meta>;

function LiveModalDemo() {
  const { kit, isConnected, address, config } = usePasskeyWallet();
  const [transaction, setTransaction] = useState<AssembledTransaction<unknown> | null>(null);
  const [open, setOpen] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [lastHash, setLastHash] = useState<string | null>(null);

  const prepare = async () => {
    if (!kit || !address) return;
    setBuilding(true);
    setBuildError(null);
    try {
      const tx = await buildTransferTransaction(kit, {
        tokenContract: config.nativeTokenContract,
        to: address, // self-transfer keeps your test funds
        amount: "0.1",
      });
      setTransaction(tx);
      setOpen(true);
    } catch (err) {
      setBuildError(toSembolError(err).userMessage);
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="sembol-story-stack">
      <div className="sembol-story-row">
        <ConnectWalletButton />
        <WalletBalance />
      </div>
      <div className="sembol-story-row">
        <button
          type="button"
          className="sembol-btn sembol-btn--secondary"
          onClick={() => void prepare()}
          disabled={!isConnected || building}
        >
          {building ? "Simulating…" : "Prepare transaction (0.1 XLM self-transfer)"}
        </button>
      </div>
      {buildError && <p className="sembol-story-note">⚠️ {buildError}</p>}
      {lastHash && (
        <p className="sembol-story-note">
          ✓ Submitted:{" "}
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${lastHash}`}
            target="_blank"
            rel="noreferrer"
          >
            view on stellar.expert ↗
          </a>
        </p>
      )}
      {!isConnected && (
        <p className="sembol-story-note">Connect a funded wallet first to try the live flow.</p>
      )}
      <SignTransactionModal
        open={open}
        transaction={transaction}
        description="Storybook live demo — sends 0.1 XLM from your test wallet to itself."
        onClose={() => setOpen(false)}
        onSuccess={(result) => setLastHash(result.hash)}
      />
    </div>
  );
}

/** Full live flow on testnet: build → summarize → approve with passkey → submit. */
export const LiveApprovalFlow: Story = {
  args: { open: false, transaction: null, onClose: () => {} },
  render: () => <LiveModalDemo />,
};
