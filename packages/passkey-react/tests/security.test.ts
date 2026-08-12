import { beforeEach, describe, expect, it } from "vitest";
import { Buffer } from "buffer";
import { StrKey } from "@stellar/stellar-sdk";
import {
  createDelegatedSigner,
  createEd25519Signer,
  createExternalSigner,
  createWebAuthnSigner,
  getCredentialIdFromSigner,
  getSignerKey,
  LEDGERS_PER_DAY,
  LEDGERS_PER_HOUR,
  LEDGERS_PER_WEEK,
  type ContextRule,
  type ContractSigner,
} from "smart-account-kit";
import { SEMBOL_TESTNET_ARTIFACTS } from "../src/artifacts";
import {
  describeLedgerPeriod,
  findEnforcedRuleId,
  findSpendingPolicyRule,
  periodToLedgers,
} from "../src/internal/policy";
import {
  findDefaultRule,
  saveSignerNickname,
  signerKind,
  toSignerInfos,
} from "../src/internal/security";
import type { ResolvedSembolConfig } from "../src/types";
import { CONTRACT_ID, createFakeKit, makeContextRule } from "./helpers/fakeKit";

const CONFIG: ResolvedSembolConfig = {
  ...SEMBOL_TESTNET_ARTIFACTS,
  appName: "Sembol Test",
  network: "testnet",
  explorerBaseUrl: "https://stellar.expert/explorer/testnet",
};

const TOKEN = SEMBOL_TESTNET_ARTIFACTS.nativeTokenContract;
const POLICY = SEMBOL_TESTNET_ARTIFACTS.spendingLimitPolicyAddress;
// Any valid-but-different C addresses work for negative fixtures.
const OTHER_TOKEN = SEMBOL_TESTNET_ARTIFACTS.webauthnVerifierAddress;

// Built through the kit's own constructors so key layouts match production.
const PASSKEY = createWebAuthnSigner(
  CONFIG.webauthnVerifierAddress,
  new Uint8Array(65).fill(4),
  Buffer.from("device-a-cred"),
);
const DEVICE_CRED = getCredentialIdFromSigner(PASSKEY)!;
const ED25519 = createEd25519Signer(CONFIG.ed25519VerifierAddress!, Buffer.alloc(32, 9));
const WALLET = createDelegatedSigner(StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 7)));
const CONTRACT_DELEGATE: ContractSigner = { tag: "Delegated", values: [CONTRACT_ID] };
const UNKNOWN_EXTERNAL = createExternalSigner(
  SEMBOL_TESTNET_ARTIFACTS.spendingLimitPolicyAddress,
  Buffer.alloc(65, 1),
);

function policyRule(id: number, signers: ContractSigner[], token = TOKEN): ContextRule {
  return makeContextRule({
    id,
    context_type: { tag: "CallContract", values: [token] },
    name: "Spending limit",
    policies: [POLICY],
    signers,
  });
}

describe("periodToLedgers", () => {
  it("converts hours, days, and weeks into ledger windows", () => {
    expect(periodToLedgers({ hours: 2 })).toBe(2 * LEDGERS_PER_HOUR);
    expect(periodToLedgers({ days: 3 })).toBe(3 * LEDGERS_PER_DAY);
    expect(periodToLedgers({ weeks: 1 })).toBe(LEDGERS_PER_WEEK);
    expect(periodToLedgers({ hours: 1.5 })).toBe(1080);
  });

  it("prefers raw ledgers, floors fractions, and defaults to one day", () => {
    expect(periodToLedgers({ ledgers: 999.9 })).toBe(999);
    expect(periodToLedgers({ ledgers: 100, hours: 5 })).toBe(100);
    expect(periodToLedgers({})).toBe(LEDGERS_PER_DAY);
  });
});

describe("describeLedgerPeriod", () => {
  it("describes round windows in the closest unit", () => {
    expect(describeLedgerPeriod(LEDGERS_PER_HOUR)).toBe("~1 hour");
    expect(describeLedgerPeriod(LEDGERS_PER_DAY)).toBe("~1 day");
    expect(describeLedgerPeriod(3 * LEDGERS_PER_DAY)).toBe("~3 days");
    expect(describeLedgerPeriod(LEDGERS_PER_WEEK)).toBe("~1 week");
    expect(describeLedgerPeriod(2 * LEDGERS_PER_WEEK)).toBe("~2 weeks");
  });

  it("falls back to fractional hours for uneven windows", () => {
    expect(describeLedgerPeriod(1080)).toBe("~1.5 hours");
    expect(describeLedgerPeriod(360)).toBe("~0.5 hours");
  });
});

describe("findSpendingPolicyRule", () => {
  it("prefers the rule containing the active credential, else the lowest id", () => {
    const rules = [policyRule(5, [PASSKEY]), policyRule(2, [WALLET])];
    expect(findSpendingPolicyRule(rules, TOKEN, POLICY, DEVICE_CRED)?.id).toBe(5);
    expect(findSpendingPolicyRule(rules, TOKEN, POLICY, null)?.id).toBe(2);
    expect(findSpendingPolicyRule(rules, TOKEN, POLICY, "someone-else")?.id).toBe(2);
  });

  it("ignores rules that don't carry the policy for this token", () => {
    const rules = [
      makeContextRule({ id: 1, signers: [PASSKEY] }),
      makeContextRule({
        id: 2,
        context_type: { tag: "CallContract", values: [TOKEN] },
        policies: [],
        signers: [PASSKEY],
      }),
      policyRule(3, [PASSKEY], OTHER_TOKEN),
    ];
    expect(findSpendingPolicyRule(rules, TOKEN, POLICY, DEVICE_CRED)).toBeNull();
  });
});

describe("findEnforcedRuleId", () => {
  it("returns null when no policy address is configured", async () => {
    const kit = createFakeKit();
    await expect(findEnforcedRuleId(kit.asKit(), TOKEN, undefined, DEVICE_CRED)).resolves.toBeNull();
    expect(kit.rules.list).not.toHaveBeenCalled();
  });

  it("returns null when rule discovery fails", async () => {
    const kit = createFakeKit();
    kit.rules.list.mockRejectedValue(new Error("indexer down"));
    await expect(findEnforcedRuleId(kit.asKit(), TOKEN, POLICY, DEVICE_CRED)).resolves.toBeNull();
  });

  it("returns null when the active credential cannot satisfy the rule", async () => {
    const kit = createFakeKit();
    kit.rules.list.mockResolvedValue([policyRule(4, [WALLET])]);
    await expect(findEnforcedRuleId(kit.asKit(), TOKEN, POLICY, DEVICE_CRED)).resolves.toBeNull();
  });

  it("pins the policy rule when the active credential is on it", async () => {
    const kit = createFakeKit();
    kit.rules.list.mockResolvedValue([
      makeContextRule({ id: 0, signers: [PASSKEY] }),
      policyRule(4, [PASSKEY]),
    ]);
    await expect(findEnforcedRuleId(kit.asKit(), TOKEN, POLICY, DEVICE_CRED)).resolves.toBe(4);
  });
});

describe("signerKind", () => {
  it("classifies every signer variant against the configured verifiers", () => {
    expect(signerKind(PASSKEY, CONFIG)).toBe("passkey");
    expect(signerKind(ED25519, CONFIG)).toBe("ed25519");
    expect(signerKind(WALLET, CONFIG)).toBe("wallet");
    expect(signerKind(CONTRACT_DELEGATE, CONFIG)).toBe("contract");
    expect(signerKind(UNKNOWN_EXTERNAL, CONFIG)).toBe("unknown");
  });
});

describe("findDefaultRule", () => {
  it("picks the lowest-id Default rule and ignores scoped rules", () => {
    const rules = [policyRule(0, [PASSKEY]), makeContextRule({ id: 6 }), makeContextRule({ id: 3 })];
    expect(findDefaultRule(rules)?.id).toBe(3);
    expect(findDefaultRule([policyRule(1, [PASSKEY])])).toBeNull();
    expect(findDefaultRule([])).toBeNull();
  });
});

describe("toSignerInfos", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("derives display fields and flags the active credential", () => {
    const rule = makeContextRule({ id: 2, signers: [PASSKEY, WALLET] });
    const [passkey, wallet] = toSignerInfos(rule, CONFIG, CONTRACT_ID, DEVICE_CRED);
    if (!passkey || !wallet) throw new Error("expected two signer infos");

    expect(passkey.kind).toBe("passkey");
    expect(passkey.isActive).toBe(true);
    expect(passkey.credentialId).toBe(DEVICE_CRED);
    expect(passkey.key).toBe(getSignerKey(PASSKEY));
    expect(passkey.ruleId).toBe(2);
    expect(passkey.display).toMatch(/^cred:/);

    expect(wallet.kind).toBe("wallet");
    expect(wallet.isActive).toBe(false);
    expect(wallet.credentialId).toBeUndefined();

    const inactive = toSignerInfos(rule, CONFIG, CONTRACT_ID, null);
    expect(inactive.every((info) => !info.isActive)).toBe(true);
  });

  it("joins nicknames saved via saveSignerNickname, per contract", () => {
    const rule = makeContextRule({ id: 0, signers: [PASSKEY, WALLET] });
    saveSignerNickname(CONTRACT_ID, getSignerKey(PASSKEY), "Backup phone");

    const [passkey, wallet] = toSignerInfos(rule, CONFIG, CONTRACT_ID, null);
    if (!passkey || !wallet) throw new Error("expected two signer infos");
    expect(passkey.nickname).toBe("Backup phone");
    expect(wallet.nickname).toBeUndefined();

    // Names are scoped to the wallet contract they were saved for.
    const otherWallet = toSignerInfos(rule, CONFIG, OTHER_TOKEN, null);
    expect(otherWallet[0]?.nickname).toBeUndefined();
  });
});
