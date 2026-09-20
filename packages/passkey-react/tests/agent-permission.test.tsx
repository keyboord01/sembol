import { describe, expect, it } from "vitest";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Buffer } from "buffer";
import { StrKey, xdr } from "@stellar/stellar-sdk";
import { createEd25519Signer, createWebAuthnSigner, getCredentialIdFromSigner } from "smart-account-kit";
import { PasskeyWalletProvider } from "../src/components/PasskeyWalletProvider";
import { AgentPermissions } from "../src/components/AgentPermissions";
import { GrantAgentAccess } from "../src/components/GrantAgentAccess";
import { SEMBOL_TESTNET_ARTIFACTS } from "../src/artifacts";
import { agentKeyBytes, findAgentRules, useAgentPermission } from "../src/hooks/useAgentPermission";
import type { SembolConfig } from "../src/types";
import { CONTRACT_ID, createFakeKit, makeContextRule } from "./helpers/fakeKit";

const CONFIG: SembolConfig = { ...SEMBOL_TESTNET_ARTIFACTS, appName: "Sembol Test" };
const ED25519 = SEMBOL_TESTNET_ARTIFACTS.ed25519VerifierAddress;
const POLICY = SEMBOL_TESTNET_ARTIFACTS.spendingLimitPolicyAddress;

const PASSKEY = createWebAuthnSigner(SEMBOL_TESTNET_ARTIFACTS.webauthnVerifierAddress, new Uint8Array(65).fill(4), Buffer.from("active-device-cred"));
const ACTIVE_CRED = getCredentialIdFromSigner(PASSKEY)!;
const AGENT_BYTES = Buffer.alloc(32, 7);
const AGENT_G = StrKey.encodeEd25519PublicKey(AGENT_BYTES);
const AGENT_SIGNER = createEd25519Signer(ED25519, AGENT_BYTES);
const session = { contractId: CONTRACT_ID, credentialId: ACTIVE_CRED };

function wrapperFor(kit: ReturnType<typeof createFakeKit>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <PasskeyWalletProvider config={CONFIG} kit={kit.asKit()}>
        {children}
      </PasskeyWalletProvider>
    );
  };
}

const passkeyRule = () => makeContextRule({ id: 0, name: "multisig", signers: [PASSKEY] });
const agentRule = (id = 3, policies: string[] = [POLICY], valid_until: number | null = 5000) =>
  makeContextRule({ id, name: "keeper", signers: [AGENT_SIGNER], policies, valid_until: valid_until ?? undefined });

function kitWithLedger(sequence = 4000) {
  const kit = createFakeKit({ session });
  (kit.rpc as { getLatestLedger?: () => Promise<{ sequence: number }> }).getLatestLedger = async () => ({ sequence });
  return kit;
}

describe("agentKeyBytes / findAgentRules", () => {
  it("accepts a G-address, hex, or raw bytes", () => {
    expect(agentKeyBytes(AGENT_G)).toEqual(new Uint8Array(AGENT_BYTES));
    expect(agentKeyBytes(AGENT_BYTES.toString("hex"))).toEqual(new Uint8Array(AGENT_BYTES));
    expect(agentKeyBytes(new Uint8Array(AGENT_BYTES))).toEqual(new Uint8Array(AGENT_BYTES));
    expect(() => agentKeyBytes("not-a-key")).toThrow(/G-address/);
  });

  it("classifies only rules whose every signer is an Ed25519 external signer", () => {
    const mixed = makeContextRule({ id: 9, signers: [PASSKEY, AGENT_SIGNER] });
    expect(findAgentRules([passkeyRule(), agentRule(), mixed], ED25519).map((r) => r.id)).toEqual([3]);
    expect(findAgentRules([agentRule()], undefined)).toEqual([]);
  });
});

describe("useAgentPermission", () => {
  it("lists grants with policies and ledgers left", async () => {
    const kit = kitWithLedger(4000);
    kit.rules.list.mockResolvedValue([passkeyRule(), agentRule(3, [POLICY], 5000), agentRule(4, [], null)]);
    const { result } = renderHook(() => useAgentPermission(), { wrapper: wrapperFor(kit) });

    await waitFor(() => expect(result.current.grants).toHaveLength(2));
    expect(result.current.grants[0]).toMatchObject({ ruleId: 3, name: "keeper", agentPublicKeys: [AGENT_G], policies: [POLICY], unrestricted: false, validUntil: 5000, ledgersLeft: 1000 });
    expect(result.current.grants[1]).toMatchObject({ ruleId: 4, unrestricted: true, validUntil: null, ledgersLeft: null });
  });

  it("grant adds a Default rule with the agent signer, the policies and an expiry", async () => {
    const kit = kitWithLedger(4000);
    kit.rules.list.mockResolvedValueOnce([passkeyRule()]).mockResolvedValue([passkeyRule(), agentRule(3)]);
    const { result } = renderHook(() => useAgentPermission(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.rules.list).toHaveBeenCalled());

    const params = xdr.ScVal.scvVoid();
    let out: { ruleId: number; hash: string } | undefined;
    await act(async () => {
      out = await result.current.grant({ agentPublicKey: AGENT_G, policies: new Map([[POLICY, params]]), name: "keeper", validFor: { days: 1 } });
    });

    expect(kit.rules.add).toHaveBeenCalledWith({ tag: "Default", values: undefined }, "keeper", [AGENT_SIGNER], expect.any(Map), 4000 + 17280);
    const policies = kit.rules.add.mock.calls[0]?.[3] as Map<string, unknown>;
    expect(policies.get(POLICY)).toBe(params);
    expect(kit.signAndSubmit).toHaveBeenCalledWith({ op: "rules.add" });
    expect(out).toMatchObject({ ruleId: 3 });
    expect(result.current.status).toBe("success");
  });

  it("refuses an unrestricted grant unless explicitly allowed", async () => {
    const kit = kitWithLedger();
    kit.rules.list.mockResolvedValue([passkeyRule()]);
    const { result } = renderHook(() => useAgentPermission(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(kit.rules.list).toHaveBeenCalled());

    await expect(result.current.grant({ agentPublicKey: AGENT_G, policies: new Map() })).rejects.toMatchObject({ code: "invalid_input" });
    expect(kit.rules.add).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.grant({ agentPublicKey: AGENT_G, policies: new Map(), allowUnrestricted: true, validUntilLedger: 9999 });
    });
    expect(kit.rules.add).toHaveBeenCalledWith(expect.anything(), "agent", [AGENT_SIGNER], expect.any(Map), 9999);
  });

  it("revoke removes the rule and refuses non-agent rules", async () => {
    const kit = kitWithLedger();
    kit.rules.list.mockResolvedValue([passkeyRule(), agentRule(3)]);
    const { result } = renderHook(() => useAgentPermission(), { wrapper: wrapperFor(kit) });
    await waitFor(() => expect(result.current.grants).toHaveLength(1));

    await act(async () => {
      await result.current.revoke(3);
    });
    expect(kit.rules.remove).toHaveBeenCalledWith(3);
    expect(kit.signAndSubmit).toHaveBeenCalledWith({ op: "rules.remove" });

    await expect(result.current.revoke(0)).rejects.toMatchObject({ code: "invalid_input" });
    await expect(result.current.revoke(42)).rejects.toMatchObject({ code: "policy_not_found" });
  });
});

describe("<GrantAgentAccess /> and <AgentPermissions />", () => {
  it("shows the summary and grants on click", async () => {
    const kit = kitWithLedger(4000);
    kit.rules.list.mockResolvedValueOnce([passkeyRule()]).mockResolvedValue([passkeyRule(), agentRule(3)]);
    const Wrapper = wrapperFor(kit);
    render(
      <Wrapper>
        <GrantAgentAccess agentPublicKey={AGENT_G} policies={new Map([[POLICY, xdr.ScVal.scvVoid()]])} name="keeper" agentLabel="the Niet keeper" summary={["Move USDC between XOXNO hubs", "Repay debt from idle USDC"]} />
      </Wrapper>,
    );
    expect(screen.getByText(/Allow the Niet keeper to act on this wallet for about 1 day/)).toBeInTheDocument();
    expect(screen.getByText("Move USDC between XOXNO hubs")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Grant access/ }));
    await waitFor(() => expect(kit.rules.add).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: /Granted \(rule 3\)/ })).toBeInTheDocument());
  });

  it("flags unrestricted grants and revokes with a two-step confirm", async () => {
    const kit = kitWithLedger(4000);
    kit.rules.list.mockResolvedValue([passkeyRule(), agentRule(3), agentRule(4, [], null)]);
    const Wrapper = wrapperFor(kit);
    render(
      <Wrapper>
        <AgentPermissions />
      </Wrapper>,
    );
    await waitFor(() => expect(screen.getAllByText("keeper")).toHaveLength(2));
    expect(screen.getByText(/no policy: unrestricted/)).toBeInTheDocument();
    expect(screen.getByText(/~1 h left/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /Revoke keeper/ })[0]!);
    expect(kit.rules.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm revoke" }));
    await waitFor(() => expect(kit.rules.remove).toHaveBeenCalledWith(3));
  });
});
