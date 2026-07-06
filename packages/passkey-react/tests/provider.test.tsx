import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { PasskeyWalletProvider } from "../src/components/PasskeyWalletProvider";
import { usePasskeyWallet } from "../src/hooks/usePasskeyWallet";
import { CONTRACT_ID, CREDENTIAL_ID, createFakeKit, TEST_CONFIG } from "./helpers/fakeKit";

function wrapperFor(kit: ReturnType<typeof createFakeKit>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <PasskeyWalletProvider config={TEST_CONFIG} kit={kit.asKit()}>
        {children}
      </PasskeyWalletProvider>
    );
  };
}

describe("PasskeyWalletProvider", () => {
  it("throws a helpful error when hooks are used outside the provider", () => {
    expect(() => renderHook(() => usePasskeyWallet())).toThrow(/PasskeyWalletProvider/);
  });

  it("settles to disconnected when no session is stored", async () => {
    const kit = createFakeKit();
    const { result } = renderHook(() => usePasskeyWallet(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.status).toBe("disconnected"));
    expect(result.current.address).toBeNull();
    expect(kit.connectWallet).toHaveBeenCalledWith(); // silent restore, no prompt
  });

  it("silently restores a stored session on mount", async () => {
    const kit = createFakeKit({ session: { contractId: CONTRACT_ID, credentialId: CREDENTIAL_ID } });
    const { result } = renderHook(() => usePasskeyWallet(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.status).toBe("connected"));
    expect(result.current.address).toBe(CONTRACT_ID);
    expect(result.current.credentialId).toBe(CREDENTIAL_ID);
    expect(result.current.isConnected).toBe(true);
  });

  it("connect() prompts and updates state", async () => {
    const kit = createFakeKit();
    const { result } = renderHook(() => usePasskeyWallet(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.status).toBe("disconnected"));

    await act(async () => {
      const connected = await result.current.connect();
      expect(connected).toEqual({ contractId: CONTRACT_ID, credentialId: CREDENTIAL_ID });
    });
    expect(result.current.status).toBe("connected");
    expect(kit.connectWallet).toHaveBeenLastCalledWith(
      expect.objectContaining({ prompt: true }),
    );
  });

  it("maps WebAuthn cancellation into a SembolError and recovers", async () => {
    const kit = createFakeKit();
    const cancel = new Error("user backed out");
    cancel.name = "NotAllowedError";
    kit.connectWallet.mockImplementation(async (opts?: { prompt?: boolean }) => {
      if (opts?.prompt) throw cancel;
      return null;
    });

    const { result } = renderHook(() => usePasskeyWallet(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.status).toBe("disconnected"));

    await act(async () => {
      await expect(result.current.connect()).rejects.toMatchObject({ code: "user_cancelled" });
    });
    expect(result.current.status).toBe("disconnected");
    expect(result.current.error?.code).toBe("user_cancelled");
    expect(result.current.error?.recoverable).toBe(true);
  });

  it("recovers via the indexer when a passkey's wallet isn't derivable", async () => {
    const kit = createFakeKit();
    (kit as unknown as { indexer: object }).indexer = {};
    (kit as unknown as { discoverContractsByCredential: unknown }).discoverContractsByCredential =
      vi.fn(async () => [{ contract_id: CONTRACT_ID }]);
    kit.connectWallet.mockImplementation(
      async (opts?: { prompt?: boolean; credentialId?: string; contractId?: string }) => {
        if (opts?.credentialId && opts?.contractId) {
          kit.simulateConnected(opts.contractId, opts.credentialId);
          return { contractId: opts.contractId, credentialId: opts.credentialId };
        }
        if (opts?.prompt) {
          throw new Error(
            `Smart account contract not found on-chain for credential ${CREDENTIAL_ID}. ` +
              "The wallet may not have been deployed yet.",
          );
        }
        return null;
      },
    );

    const { result } = renderHook(() => usePasskeyWallet(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.status).toBe("disconnected"));

    await act(async () => {
      const connected = await result.current.connect();
      expect(connected).toEqual({ contractId: CONTRACT_ID, credentialId: CREDENTIAL_ID });
    });
    expect(result.current.status).toBe("connected");
    expect(result.current.error).toBeNull();
  });

  it("createWallet() connects and clears errors", async () => {
    const kit = createFakeKit();
    const { result } = renderHook(() => usePasskeyWallet(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.status).toBe("disconnected"));

    await act(async () => {
      const created = await result.current.createWallet({ userName: "tester" });
      expect(created.contractId).toBe(CONTRACT_ID);
    });
    expect(result.current.status).toBe("connected");
    expect(kit.createWallet).toHaveBeenCalledWith(
      "Sembol Test",
      "tester",
      expect.objectContaining({ autoSubmit: true }),
    );
    // Funding is Sembol's own Friendbot call, not the kit's autoFund.
    expect(kit.rpc.fundAddress).toHaveBeenCalledWith(CONTRACT_ID);
  });

  it("disconnect() clears connection state", async () => {
    const kit = createFakeKit({ session: { contractId: CONTRACT_ID, credentialId: CREDENTIAL_ID } });
    const { result } = renderHook(() => usePasskeyWallet(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.status).toBe("connected"));

    await act(async () => {
      await result.current.disconnect();
    });
    expect(result.current.status).toBe("disconnected");
    expect(result.current.address).toBeNull();
  });

  it("bumps txEpoch when the kit submits transactions", async () => {
    const kit = createFakeKit({ session: { contractId: CONTRACT_ID, credentialId: CREDENTIAL_ID } });
    const { result } = renderHook(() => usePasskeyWallet(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.status).toBe("connected"));
    const before = result.current.txEpoch;

    act(() => {
      kit.events.emit("transactionSubmitted", { hash: "x", success: true });
    });
    await waitFor(() => expect(result.current.txEpoch).toBe(before + 1));
  });

  it("fund() requires a connection", async () => {
    const kit = createFakeKit();
    const { result } = renderHook(() => usePasskeyWallet(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.status).toBe("disconnected"));
    await expect(result.current.fund()).rejects.toMatchObject({ code: "wallet_not_connected" });
  });
});
