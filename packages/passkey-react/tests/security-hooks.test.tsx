import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Buffer } from "buffer";
import { StrKey } from "@stellar/stellar-sdk";
import {
  createDelegatedSigner,
  createWebAuthnSigner,
  getCredentialIdFromSigner,
  getSignerKey,
  SmartAccountError,
  SmartAccountErrorCode,
  type ContractSigner,
} from "smart-account-kit";
import { PasskeyWalletProvider } from "../src/components/PasskeyWalletProvider";
import { SEMBOL_TESTNET_ARTIFACTS } from "../src/artifacts";
import { useAddSigner } from "../src/hooks/useAddSigner";
import { useRecovery, type RecoverOutcome } from "../src/hooks/useRecovery";
import { useRemoveSigner } from "../src/hooks/useRemoveSigner";
import { useSigners } from "../src/hooks/useSigners";
import { useSpendingPolicy } from "../src/hooks/useSpendingPolicy";
import type { SignerInfo } from "../src/internal/security";
import type { SembolConfig } from "../src/types";
import { CONTRACT_ID, createFakeKit, makeContextRule, TEST_CONFIG } from "./helpers/fakeKit";

// Full testnet artifact set so signer classification and the spending-limit
// policy address resolve exactly like a preset-configured app.
const SECURITY_CONFIG: SembolConfig = { ...SEMBOL_TESTNET_ARTIFACTS, appName: "Sembol Test" };

const TOKEN = SEMBOL_TESTNET_ARTIFACTS.nativeTokenContract;
const POLICY = SEMBOL_TESTNET_ARTIFACTS.spendingLimitPolicyAddress;
// Distinct valid C addresses for discovery fixtures.
const FOUND_CONTRACT = SEMBOL_TESTNET_ARTIFACTS.webauthnVerifierAddress;
const SECOND_CONTRACT = SEMBOL_TESTNET_ARTIFACTS.ed25519VerifierAddress;

// The credential is derived from raw bytes so it round-trips the kit's
// base64url key packing exactly.
const ACTIVE_PASSKEY = createWebAuthnSigner(
  SEMBOL_TESTNET_ARTIFACTS.webauthnVerifierAddress,
  new Uint8Array(65).fill(4),
  Buffer.from("active-device-cred"),
);
const ACTIVE_CRED = getCredentialIdFromSigner(ACTIVE_PASSKEY)!;
const OTHER_WALLET = createDelegatedSigner(StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 5)));
const VALID_G = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 11));

const session = { contractId: CONTRACT_ID, credentialId: ACTIVE_CRED };

function wrapperFor(kit: ReturnType<typeof createFakeKit>, config: SembolConfig = SECURITY_CONFIG) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <PasskeyWalletProvider config={config} kit={kit.asKit()}>
        {children}
      </PasskeyWalletProvider>
    );
  };
}

function defaultRule(signers: ContractSigner[] = [ACTIVE_PASSKEY, OTHER_WALLET], id = 0) {
  return makeContextRule({ id, signers });
}

function spendingRule(id = 7) {
  return makeContextRule({
    id,
    context_type: { tag: "CallContract", values: [TOKEN] },
    name: "Spending limit",
    policies: [POLICY],
    signers: [ACTIVE_PASSKEY],
  });
}

function infoFor(signer: ContractSigner, ruleId: number): SignerInfo {
  return {
    signer,
    ruleId,
    key: getSignerKey(signer),
    kind: "wallet",
    display: "test-signer",
    isActive: false,
  };
}

beforeEach(() => {
  // The provider and the nickname store both persist here.
  localStorage.clear();
});

describe("useSigners", () => {
  it("lists the Default rule's signers when connected", async () => {
    const kit = createFakeKit({ session });
    kit.rules.list.mockResolvedValue([defaultRule(), spendingRule()]);
    const { result } = renderHook(() => useSigners(), { wrapper: wrapperFor(kit) });

    await waitFor(() => expect(result.current.signers).toHaveLength(2));
    expect(result.current.activeRuleId).toBe(0);
    expect(result.current.rules).toHaveLength(2);
    expect(result.current.signers[0]).toMatchObject({ kind: "passkey", isActive: true });
    expect(result.current.signers[1]).toMatchObject({ kind: "wallet", isActive: false });
  });

  it("stays empty and reads nothing while disconnected", async () => {
    const kit = createFakeKit();
    const { result } = renderHook(() => useSigners(), { wrapper: wrapperFor(kit) });

    await waitFor(() => expect(kit.connectWallet).toHaveBeenCalled());
    expect(result.current.signers).toEqual([]);
    expect(result.current.activeRuleId).toBeNull();
    expect(kit.rules.list).not.toHaveBeenCalled();
  });

  it("surfaces read errors and recovers on refresh", async () => {
    const kit = createFakeKit({ session });
    kit.rules.list.mockRejectedValue(new Error("indexer down"));
    const { result } = renderHook(() => useSigners(), { wrapper: wrapperFor(kit) });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.signers).toEqual([]);

    kit.rules.list.mockResolvedValue([defaultRule([ACTIVE_PASSKEY])]);
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.signers).toHaveLength(1);
  });
});

describe("useAddSigner", () => {
  it("addPasskey registers, creates the signer's own rule, and saves the nickname", async () => {
    const kit = createFakeKit({ session });
    const { result } = renderHook(() => useAddSigner(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.isConnected).toBe(true));

    await act(async () => {
      await expect(result.current.addPasskey({ nickname: "laptop" })).resolves.toEqual({
        credentialId: "new-passkey-cred",
      });
    });

    // Registration only (no tx), then a new single-signer Default rule.
    expect(kit.credentials.create).toHaveBeenCalledWith({
      nickname: "laptop",
      appName: "Sembol Test",
    });
    expect(kit.rules.add).toHaveBeenCalledWith(
      { tag: "Default", values: undefined },
      "laptop",
      [expect.objectContaining({ tag: "External" })],
      new Map(),
    );
    expect(kit.signAndSubmit).toHaveBeenCalledWith({ op: "rules.add" });
    expect(result.current.status).toBe("success");

    const stored = JSON.parse(localStorage.getItem(`sembol:signer-names:${CONTRACT_ID}`) ?? "{}");
    expect(Object.values(stored)).toContain("laptop");
  });

  it("addEd25519 rejects a malformed public key", async () => {
    const kit = createFakeKit({ session });
    kit.rules.list.mockResolvedValue([defaultRule()]);
    const { result } = renderHook(() => useAddSigner(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.isConnected).toBe(true));

    await act(async () => {
      await expect(result.current.addEd25519("not-a-key")).rejects.toMatchObject({
        code: "invalid_input",
      });
    });
    expect(kit.signers.addBatch).not.toHaveBeenCalled();
  });

  it("addEd25519 requires the Ed25519 verifier in the config", async () => {
    const kit = createFakeKit({ session });
    kit.rules.list.mockResolvedValue([defaultRule()]);
    // TEST_CONFIG has no ed25519VerifierAddress.
    const { result } = renderHook(() => useAddSigner(), {
      wrapper: wrapperFor(kit, TEST_CONFIG),
    });
    await waitFor(() => expect(kit.isConnected).toBe(true));

    await act(async () => {
      await expect(result.current.addEd25519(VALID_G)).rejects.toMatchObject({
        code: "invalid_input",
        message: expect.stringContaining("ed25519VerifierAddress"),
      });
    });
    expect(kit.signers.addBatch).not.toHaveBeenCalled();
  });

  it("addWallet rejects an invalid Stellar address", async () => {
    const kit = createFakeKit({ session });
    kit.rules.list.mockResolvedValue([defaultRule()]);
    const { result } = renderHook(() => useAddSigner(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.isConnected).toBe(true));

    await act(async () => {
      await expect(result.current.addWallet("not-a-wallet")).rejects.toMatchObject({
        code: "invalid_input",
      });
    });
    expect(kit.signers.addDelegated).not.toHaveBeenCalled();
  });

  it("maps failed submissions to a SembolError and error status", async () => {
    const kit = createFakeKit({ session });
    kit.rules.list.mockResolvedValue([defaultRule()]);
    kit.signAndSubmit.mockResolvedValue({
      success: false,
      error: new SmartAccountError("tx failed", SmartAccountErrorCode.TRANSACTION_SUBMISSION_FAILED),
    });
    const { result } = renderHook(() => useAddSigner(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.isConnected).toBe(true));

    await act(async () => {
      await expect(result.current.addPasskey()).rejects.toMatchObject({
        code: "submission_failed",
      });
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error?.code).toBe("submission_failed");
  });
});

describe("useRemoveSigner", () => {
  it("refuses to remove the rule's last signer", async () => {
    const kit = createFakeKit({ session });
    kit.rules.list.mockResolvedValue([defaultRule([ACTIVE_PASSKEY])]);
    const { result } = renderHook(() => useRemoveSigner(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.isConnected).toBe(true));

    await act(async () => {
      await expect(result.current.removeSigner(infoFor(ACTIVE_PASSKEY, 0))).rejects.toMatchObject({
        code: "last_signer",
      });
    });
    expect(kit.signers.remove).not.toHaveBeenCalled();
    expect(result.current.status).toBe("error");
  });

  it("removes a signer and submits the transaction", async () => {
    const kit = createFakeKit({ session });
    kit.rules.list.mockResolvedValue([defaultRule()]);
    const { result } = renderHook(() => useRemoveSigner(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.isConnected).toBe(true));

    await act(async () => {
      await result.current.removeSigner(infoFor(OTHER_WALLET, 0));
    });
    expect(kit.signers.remove).toHaveBeenCalledWith(0, OTHER_WALLET);
    expect(kit.signAndSubmit).toHaveBeenCalledWith({ op: "signers.remove" });
    expect(result.current.status).toBe("success");
  });

  it("fails when the target rule no longer exists", async () => {
    const kit = createFakeKit({ session });
    kit.rules.list.mockResolvedValue([]);
    const { result } = renderHook(() => useRemoveSigner(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.isConnected).toBe(true));

    await act(async () => {
      await expect(result.current.removeSigner(infoFor(OTHER_WALLET, 3))).rejects.toMatchObject({
        code: "invalid_input",
        message: expect.stringContaining("no longer exists"),
      });
    });
    expect(kit.signers.remove).not.toHaveBeenCalled();
  });
});

describe("useRecovery.recover", () => {
  const REC_CRED = "backup-cred";

  function recoveryKit() {
    const kit = createFakeKit();
    kit.authenticatePasskey.mockResolvedValue({ credentialId: REC_CRED, rawResponse: {} });
    return kit;
  }

  it("connects directly when given an explicit contract id", async () => {
    const kit = recoveryKit();
    const { result } = renderHook(() => useRecovery(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.connectWallet).toHaveBeenCalled());

    let outcome!: RecoverOutcome;
    await act(async () => {
      outcome = await result.current.recover({ contractId: CONTRACT_ID });
    });

    expect(outcome).toEqual({
      outcome: "connected",
      contractId: CONTRACT_ID,
      credentialId: REC_CRED,
    });
    expect(kit.connectWallet).toHaveBeenCalledWith(
      expect.objectContaining({ contractId: CONTRACT_ID, credentialId: REC_CRED, prompt: true }),
    );
    expect(kit.discoverContractsByCredential).not.toHaveBeenCalled();
    expect(result.current.status).toBe("success");
  });

  it("reuses this browser's credential-to-wallet map", async () => {
    const kit = recoveryKit();
    localStorage.setItem(`sembol:wallet:${REC_CRED}`, CONTRACT_ID);
    const { result } = renderHook(() => useRecovery(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.connectWallet).toHaveBeenCalled());

    let outcome!: RecoverOutcome;
    await act(async () => {
      outcome = await result.current.recover();
    });

    expect(outcome).toMatchObject({ outcome: "connected", contractId: CONTRACT_ID });
    expect(kit.discoverContractsByCredential).not.toHaveBeenCalled();
    expect(kit.connectWallet).toHaveBeenCalledWith(
      expect.objectContaining({ contractId: CONTRACT_ID, credentialId: REC_CRED }),
    );
  });

  it("connects through a single indexer hit", async () => {
    const kit = recoveryKit();
    kit.discoverContractsByCredential.mockResolvedValue([{ contract_id: FOUND_CONTRACT }]);
    const { result } = renderHook(() => useRecovery(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.connectWallet).toHaveBeenCalled());

    let outcome!: RecoverOutcome;
    await act(async () => {
      outcome = await result.current.recover();
    });

    expect(kit.discoverContractsByCredential).toHaveBeenCalledWith(REC_CRED);
    expect(outcome).toMatchObject({ outcome: "connected", contractId: FOUND_CONTRACT });
    expect(result.current.status).toBe("success");
  });

  it("asks the user to choose when several wallets match", async () => {
    const kit = recoveryKit();
    kit.discoverContractsByCredential.mockResolvedValue([
      { contract_id: FOUND_CONTRACT },
      { contract_id: SECOND_CONTRACT },
    ]);
    const { result } = renderHook(() => useRecovery(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.connectWallet).toHaveBeenCalled());

    let outcome!: RecoverOutcome;
    await act(async () => {
      outcome = await result.current.recover();
    });

    expect(outcome).toEqual({
      outcome: "choose",
      credentialId: REC_CRED,
      candidates: [FOUND_CONTRACT, SECOND_CONTRACT],
    });
    expect(result.current.status).toBe("choice");
    // No reconnect was attempted yet.
    expect(kit.connectWallet).not.toHaveBeenCalledWith(expect.objectContaining({ prompt: true }));
  });

  it("throws recovery_needs_address when nothing can be discovered", async () => {
    const kit = recoveryKit();
    kit.discoverContractsByCredential.mockResolvedValue([]);
    kit.connectWallet.mockImplementation(async (opts?: { prompt?: boolean }) => {
      // Deterministic derivation fails: this credential never deployed a wallet.
      if (opts?.prompt) throw new Error(`Contract not found on-chain for credential ${REC_CRED}`);
      return null;
    });
    const { result } = renderHook(() => useRecovery(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.connectWallet).toHaveBeenCalled());

    await act(async () => {
      await expect(result.current.recover()).rejects.toMatchObject({
        code: "recovery_needs_address",
      });
    });
    expect(result.current.status).toBe("error");
  });

  it("does not re-prompt the passkey on the address-fallback retry", async () => {
    const kit = recoveryKit();
    kit.discoverContractsByCredential.mockResolvedValue([]);
    kit.connectWallet.mockImplementation(
      async (opts?: { prompt?: boolean; contractId?: string; credentialId?: string }) => {
        if (opts?.contractId) {
          kit.simulateConnected(opts.contractId, opts.credentialId);
          return { contractId: opts.contractId, credentialId: opts.credentialId };
        }
        // First attempt: derivation fails, silent restore returns nothing.
        if (opts?.prompt) throw new Error(`Contract not found on-chain for credential ${REC_CRED}`);
        return null;
      },
    );
    const { result } = renderHook(() => useRecovery(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.connectWallet).toHaveBeenCalled());

    // First attempt fails discovery and asks for the address.
    await act(async () => {
      await expect(result.current.recover()).rejects.toMatchObject({
        code: "recovery_needs_address",
      });
    });
    expect(kit.authenticatePasskey).toHaveBeenCalledTimes(1);

    // Retry with the saved address: reuses the proved credential, no second ceremony.
    let outcome!: RecoverOutcome;
    await act(async () => {
      outcome = await result.current.recover({ contractId: CONTRACT_ID });
    });
    expect(outcome).toMatchObject({
      outcome: "connected",
      contractId: CONTRACT_ID,
      credentialId: REC_CRED,
    });
    expect(kit.authenticatePasskey).toHaveBeenCalledTimes(1);
  });
});

describe("useSpendingPolicy", () => {
  const LIMIT_DATA = {
    spending_limit: 100_0000000n,
    period_ledgers: 17280,
    spending_history: [],
    cached_total_spent: 25_0000000n,
  };

  it("reads the active limit into policy state", async () => {
    const kit = createFakeKit({ session });
    kit.rules.list.mockResolvedValue([defaultRule(), spendingRule()]);
    kit.spendingLimitClient.getSpendingLimitData.mockResolvedValue(LIMIT_DATA);
    const { result } = renderHook(() => useSpendingPolicy(), { wrapper: wrapperFor(kit) });

    await waitFor(() => expect(result.current.policy).not.toBeNull());
    expect(result.current.policy).toMatchObject({
      ruleId: 7,
      tokenContract: TOKEN,
      limit: 100_0000000n,
      spent: 25_0000000n,
      remaining: 75_0000000n,
      periodLedgers: 17280,
      periodLabel: "~1 day",
    });
    expect(kit.policyClients.spendingLimit).toHaveBeenCalledWith(POLICY);
  });

  it("setLimit installs a token-scoped policy rule when none exists", async () => {
    const kit = createFakeKit({ session });
    kit.rules.list.mockResolvedValue([defaultRule()]);
    const { result } = renderHook(() => useSpendingPolicy(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.rules.list).toHaveBeenCalled());

    await act(async () => {
      await result.current.setLimit({ limit: "50" });
    });

    expect(kit.convertPolicyParams).toHaveBeenCalledWith(
      "spending_limit",
      expect.objectContaining({ period_ledgers: 17280, spending_limit: 50_0000000n }),
    );
    expect(kit.rules.add).toHaveBeenCalledWith(
      { tag: "CallContract", values: [TOKEN] },
      "Spending limit",
      [ACTIVE_PASSKEY],
      expect.any(Map),
    );
    const policies = kit.rules.add.mock.calls[0]?.[3] as Map<string, unknown>;
    expect(policies.get(POLICY)).toBe(kit.convertPolicyParams.mock.results[0]?.value);
    expect(kit.signAndSubmit).toHaveBeenCalledWith({ op: "rules.add" });
    expect(result.current.status).toBe("success");
  });

  it("setLimit with only a new amount goes through the policy setter", async () => {
    const kit = createFakeKit({ session });
    const pinned = spendingRule();
    kit.rules.list.mockResolvedValue([defaultRule(), pinned]);
    kit.spendingLimitClient.getSpendingLimitData.mockResolvedValue(LIMIT_DATA);
    kit.rules.get.mockResolvedValue({ result: pinned });
    const { result } = renderHook(() => useSpendingPolicy(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.policy).not.toBeNull());

    await act(async () => {
      await result.current.setLimit({ limit: "42" });
    });

    expect(kit.rules.get).toHaveBeenCalledWith(7);
    expect(kit.spendingLimitClient.setSpendingLimit).toHaveBeenCalledWith(42_0000000n, pinned);
    expect(kit.policies.remove).not.toHaveBeenCalled();
    expect(kit.policies.add).not.toHaveBeenCalled();
    expect(kit.rules.add).not.toHaveBeenCalled();
  });

  it("setLimit re-installs the policy when the period changes", async () => {
    const kit = createFakeKit({ session });
    kit.rules.list.mockResolvedValue([defaultRule(), spendingRule()]);
    kit.spendingLimitClient.getSpendingLimitData.mockResolvedValue(LIMIT_DATA);
    const { result } = renderHook(() => useSpendingPolicy(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.policy).not.toBeNull());

    await act(async () => {
      await result.current.setLimit({ limit: "42", period: { hours: 1 } });
    });

    expect(kit.policies.remove).toHaveBeenCalledWith(7, POLICY);
    expect(kit.convertPolicyParams).toHaveBeenCalledWith(
      "spending_limit",
      expect.objectContaining({ period_ledgers: 720, spending_limit: 42_0000000n }),
    );
    expect(kit.policies.add).toHaveBeenCalledWith(
      7,
      POLICY,
      kit.convertPolicyParams.mock.results[0]?.value,
    );
    // Remove-then-add, one submission each.
    expect(kit.policies.remove.mock.invocationCallOrder[0] ?? Infinity).toBeLessThan(
      kit.policies.add.mock.invocationCallOrder[0] ?? 0,
    );
    expect(kit.signAndSubmit).toHaveBeenCalledTimes(2);
    expect(kit.spendingLimitClient.setSpendingLimit).not.toHaveBeenCalled();
  });

  it("removeLimit without an installed rule reports policy_not_found", async () => {
    const kit = createFakeKit({ session });
    kit.rules.list.mockResolvedValue([defaultRule()]);
    const { result } = renderHook(() => useSpendingPolicy(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.rules.list).toHaveBeenCalled());

    await act(async () => {
      await expect(result.current.removeLimit()).rejects.toMatchObject({
        code: "policy_not_found",
      });
    });
    expect(kit.rules.remove).not.toHaveBeenCalled();
    expect(result.current.status).toBe("error");
  });
});
