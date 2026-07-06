import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  Account,
  Address,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
  nativeToScVal,
} from "@stellar/stellar-sdk";
import { Buffer } from "buffer";
import type { AssembledTransaction } from "smart-account-kit";
import { ConnectWalletButton } from "../src/components/ConnectWalletButton";
import { CreateWalletButton } from "../src/components/CreateWalletButton";
import { PasskeyWalletProvider } from "../src/components/PasskeyWalletProvider";
import { SignTransactionModal } from "../src/components/SignTransactionModal";
import { WalletBalance } from "../src/components/WalletBalance";
import {
  CONTRACT_ID,
  CREDENTIAL_ID,
  createFakeKit,
  stubWebAuthnSupport,
  TEST_CONFIG,
  TX_HASH,
} from "./helpers/fakeKit";

const connectedSession = { contractId: CONTRACT_ID, credentialId: CREDENTIAL_ID };

let restoreWebAuthn: () => void;
beforeEach(() => {
  restoreWebAuthn = stubWebAuthnSupport();
});
afterEach(() => {
  restoreWebAuthn();
});

function renderWithProvider(ui: React.ReactElement, kit: ReturnType<typeof createFakeKit>) {
  return render(
    <PasskeyWalletProvider config={TEST_CONFIG} kit={kit.asKit()}>
      {ui}
    </PasskeyWalletProvider>,
  );
}

const SOURCE = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 3));
const DEST = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 7));

function buildRealTransfer(): AssembledTransaction<unknown> {
  const tx = new TransactionBuilder(new Account(SOURCE, "0"), {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: CONTRACT_ID,
        function: "transfer",
        args: [
          new Address(CONTRACT_ID).toScVal(),
          new Address(DEST).toScVal(),
          nativeToScVal(10000000n, { type: "i128" }),
        ],
      }),
    )
    .setTimeout(300)
    .build();
  return { built: tx } as unknown as AssembledTransaction<unknown>;
}

describe("ConnectWalletButton", () => {
  it("connects on click and renders the account chip with a menu", async () => {
    const kit = createFakeKit();
    const onConnected = vi.fn();
    renderWithProvider(<ConnectWalletButton onConnected={onConnected} />, kit);

    const button = await screen.findByRole("button", { name: /connect wallet/i });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    const chip = await screen.findByRole("button", { name: /CDLZ…CYSC/ });
    expect(onConnected).toHaveBeenCalledWith(connectedSession);

    fireEvent.click(chip);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /copy address/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: /disconnect/i }));
    await screen.findByRole("button", { name: /connect wallet/i });
  });
});

describe("CreateWalletButton", () => {
  it("creates a wallet and reports success", async () => {
    const kit = createFakeKit();
    const onSuccess = vi.fn();
    renderWithProvider(<CreateWalletButton userName="tester" onSuccess={onSuccess} />, kit);

    const button = await screen.findByRole("button", { name: /create wallet/i });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(connectedSession));
    expect(kit.createWallet).toHaveBeenCalledWith("Sembol Test", "tester", expect.any(Object));
  });

  it("surfaces errors through onError", async () => {
    const kit = createFakeKit();
    const cancel = new Error("cancelled");
    cancel.name = "NotAllowedError";
    kit.createWallet.mockRejectedValue(cancel);
    const onError = vi.fn();
    renderWithProvider(<CreateWalletButton onError={onError} />, kit);

    const button = await screen.findByRole("button", { name: /create wallet/i });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "user_cancelled" })),
    );
    // The failure must be visible, not tooltip-only.
    expect(screen.getByRole("alert")).toHaveTextContent(/cancelled or timed out/i);
  });
});

describe("WalletBalance", () => {
  it("renders the formatted balance with symbol", async () => {
    const kit = createFakeKit({ session: connectedSession });
    renderWithProvider(<WalletBalance />, kit);
    expect(await screen.findByText("12.5")).toBeInTheDocument();
    expect(screen.getByText("XLM")).toBeInTheDocument();
  });

  it("refreshes on demand", async () => {
    const kit = createFakeKit({ session: connectedSession });
    renderWithProvider(<WalletBalance />, kit);
    await screen.findByText("12.5");

    kit.rpc.getAssetBalance.mockResolvedValue({
      latestLedger: 2,
      balanceEntry: { amount: "990000000", authorized: true, clawback: false },
    });
    fireEvent.click(screen.getByRole("button", { name: /refresh balance/i }));
    expect(await screen.findByText("99")).toBeInTheDocument();
  });
});

describe("SignTransactionModal", () => {
  it("shows a transaction summary and completes the approve flow", async () => {
    const kit = createFakeKit({ session: connectedSession });
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    renderWithProvider(
      <SignTransactionModal
        open
        transaction={buildRealTransfer()}
        description="Send 1 XLM"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
      kit,
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText(/transfer\(/)).toBeInTheDocument();
    expect(screen.getByText("testnet")).toBeInTheDocument();

    await waitFor(() => expect(kit.isConnected).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(screen.getByText(/transaction confirmed/i)).toBeInTheDocument();
    const txLink = screen
      .getAllByRole("link")
      .find((link) => link.getAttribute("href")?.includes("/tx/"));
    expect(txLink).toHaveAttribute(
      "href",
      `https://stellar.expert/explorer/testnet/tx/${TX_HASH}`,
    );

    fireEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape while idle and shows friendly errors", async () => {
    const kit = createFakeKit({ session: connectedSession });
    const failure = new Error("cancelled");
    failure.name = "NotAllowedError";
    kit.signAndSubmit.mockRejectedValue(failure);
    const onClose = vi.fn();
    const onError = vi.fn();

    renderWithProvider(
      <SignTransactionModal
        open
        transaction={buildRealTransfer()}
        onClose={onClose}
        onError={onError}
      />,
      kit,
    );
    await screen.findByRole("dialog");
    await waitFor(() => expect(kit.isConnected).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(screen.getByRole("alert")).toHaveTextContent(/cancelled or timed out/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("renders nothing when closed", () => {
    const kit = createFakeKit();
    renderWithProvider(
      <SignTransactionModal open={false} transaction={null} onClose={() => {}} />,
      kit,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
