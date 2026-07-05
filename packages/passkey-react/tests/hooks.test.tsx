import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { AssembledTransaction } from "smart-account-kit";
import { PasskeyWalletProvider } from "../src/components/PasskeyWalletProvider";
import { useCreateWallet } from "../src/hooks/useCreateWallet";
import { useSignTransaction } from "../src/hooks/useSignTransaction";
import { useTransfer } from "../src/hooks/useTransfer";
import { useWalletAddress } from "../src/hooks/useWalletAddress";
import { useWalletBalance } from "../src/hooks/useWalletBalance";
import {
  CONTRACT_ID,
  CREDENTIAL_ID,
  createFakeKit,
  TEST_CONFIG,
  TX_HASH,
} from "./helpers/fakeKit";

const connectedSession = { contractId: CONTRACT_ID, credentialId: CREDENTIAL_ID };

function wrapperFor(kit: ReturnType<typeof createFakeKit>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <PasskeyWalletProvider config={TEST_CONFIG} kit={kit.asKit()}>
        {children}
      </PasskeyWalletProvider>
    );
  };
}

const FAKE_TX = { built: undefined } as unknown as AssembledTransaction<unknown>;

describe("useCreateWallet", () => {
  it("tracks phases through the creation flow", async () => {
    const kit = createFakeKit();
    // Deferred createWallet so each phase transition can be observed.
    let finishCreate!: (value: unknown) => void;
    kit.createWallet.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishCreate = resolve;
        }),
    );

    const { result } = renderHook(() => useCreateWallet(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.status).toBe("idle"));

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.createWallet();
      pending.catch(() => {});
    });
    expect(result.current.status).toBe("creating");
    expect(result.current.phase).toBe("passkey");

    act(() => {
      kit.events.emit("credentialCreated", {
        credential: {
          credentialId: CREDENTIAL_ID,
          publicKey: new Uint8Array(65),
          contractId: CONTRACT_ID,
          createdAt: 0,
        },
      });
    });
    expect(result.current.phase).toBe("deploying");

    act(() => {
      kit.events.emit("transactionSubmitted", { hash: "h", success: true });
    });
    expect(result.current.phase).toBe("funding");

    await act(async () => {
      finishCreate({
        rawResponse: {},
        credentialId: CREDENTIAL_ID,
        publicKey: new Uint8Array(65),
        contractId: CONTRACT_ID,
        signedTransaction: "AAAA",
        submitResult: { success: true, hash: "h" },
      });
      await pending;
    });
    expect(result.current.status).toBe("success");
    expect(result.current.phase).toBeNull();
    expect(result.current.result?.contractId).toBe(CONTRACT_ID);
  });

  it("captures errors and stays resettable", async () => {
    const kit = createFakeKit();
    const cancel = new Error("nope");
    cancel.name = "NotAllowedError";
    kit.createWallet.mockRejectedValue(cancel);

    const { result } = renderHook(() => useCreateWallet(), { wrapper: wrapperFor(kit) });
    await act(async () => {
      await expect(result.current.createWallet()).rejects.toMatchObject({ code: "user_cancelled" });
    });
    expect(result.current.status).toBe("error");
    act(() => result.current.reset());
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });
});

describe("useSignTransaction", () => {
  it("rejects when no wallet is connected", async () => {
    const kit = createFakeKit();
    const { result } = renderHook(() => useSignTransaction(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.status).toBe("idle"));
    await expect(result.current.signAndSubmit(FAKE_TX)).rejects.toMatchObject({
      code: "wallet_not_connected",
    });
  });

  it("signAndSubmit resolves with the transaction result", async () => {
    const kit = createFakeKit({ session: connectedSession });
    const { result } = renderHook(() => useSignTransaction(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.isConnected).toBe(true));

    await act(async () => {
      const txResult = await result.current.signAndSubmit(FAKE_TX);
      expect(txResult.hash).toBe(TX_HASH);
    });
    expect(result.current.status).toBe("success");
    expect(result.current.result?.success).toBe(true);
  });

  it("treats success:false results as submission failures", async () => {
    const kit = createFakeKit({ session: connectedSession });
    kit.signAndSubmit.mockResolvedValue({ success: false, hash: TX_HASH, error: "tx_failed" });
    const { result } = renderHook(() => useSignTransaction(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.isConnected).toBe(true));

    await act(async () => {
      await expect(result.current.signAndSubmit(FAKE_TX)).rejects.toMatchObject({
        code: "submission_failed",
      });
    });
    expect(result.current.status).toBe("error");
  });
});

describe("useTransfer", () => {
  it("validates the recipient address", async () => {
    const kit = createFakeKit({ session: connectedSession });
    const { result } = renderHook(() => useTransfer(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.isConnected).toBe(true));

    await act(async () => {
      await expect(result.current.transfer({ to: "not-an-address", amount: 1 })).rejects.toMatchObject(
        { code: "invalid_input" },
      );
    });
    expect(kit.transfer).not.toHaveBeenCalled();
  });

  it("validates the amount", async () => {
    const kit = createFakeKit({ session: connectedSession });
    const { result } = renderHook(() => useTransfer(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.isConnected).toBe(true));

    await act(async () => {
      await expect(
        result.current.transfer({ to: CONTRACT_ID, amount: "0.00000001" }),
      ).rejects.toMatchObject({ code: "invalid_input" });
      await expect(result.current.transfer({ to: CONTRACT_ID, amount: "-5" })).rejects.toMatchObject({
        code: "invalid_input",
      });
    });
    expect(kit.transfer).not.toHaveBeenCalled();
  });

  it("transfers native XLM by default", async () => {
    const kit = createFakeKit({ session: connectedSession });
    const { result } = renderHook(() => useTransfer(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.isConnected).toBe(true));

    await act(async () => {
      const txResult = await result.current.transfer({ to: CONTRACT_ID, amount: "12.5" });
      expect(txResult.success).toBe(true);
    });
    expect(kit.transfer).toHaveBeenCalledWith(
      expect.stringMatching(/^C[A-Z2-7]{55}$/), // native SAC derived from passphrase
      CONTRACT_ID,
      12.5,
      expect.any(Object),
    );
    expect(result.current.status).toBe("success");
  });
});

describe("useWalletAddress", () => {
  it("exposes display helpers for the connected wallet", async () => {
    const kit = createFakeKit({ session: connectedSession });
    const { result } = renderHook(() => useWalletAddress(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.address).toBe(CONTRACT_ID));
    expect(result.current.displayAddress).toBe("CDLZ…CYSC");
    expect(result.current.explorerUrl).toBe(
      `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`,
    );
  });
});

describe("useWalletBalance", () => {
  it("loads the native balance via the SAC fast path", async () => {
    const kit = createFakeKit({ session: connectedSession });
    const { result } = renderHook(() => useWalletBalance(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.raw).toBe(125000000n);
    expect(result.current.formatted).toBe("12.5");
    expect(result.current.symbol).toBe("XLM");
    expect(result.current.decimals).toBe(7);
  });

  it("refetches automatically after a submitted transaction", async () => {
    const kit = createFakeKit({ session: connectedSession });
    const { result } = renderHook(() => useWalletBalance(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.formatted).toBe("12.5"));

    kit.rpc.getAssetBalance.mockResolvedValue({
      latestLedger: 2,
      balanceEntry: { amount: "250000000", authorized: true, clawback: false },
    });
    act(() => {
      kit.events.emit("transactionSubmitted", { hash: "x", success: true });
    });
    await waitFor(() => expect(result.current.formatted).toBe("25"));
  });

  it("stays idle when disconnected", async () => {
    const kit = createFakeKit();
    const { result } = renderHook(() => useWalletBalance(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(kit.rpc.getAssetBalance).not.toHaveBeenCalled();
  });

  it("surfaces read errors as SembolErrors", async () => {
    const kit = createFakeKit({ session: connectedSession });
    kit.rpc.getAssetBalance.mockRejectedValue(new TypeError("fetch failed"));
    const { result } = renderHook(() => useWalletBalance(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error?.code).toBe("network_error");
  });
});
