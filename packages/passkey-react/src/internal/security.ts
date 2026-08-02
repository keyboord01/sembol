import {
  formatSignerForDisplay,
  getCredentialIdFromSigner,
  getSignerKey,
  type ContextRule,
  type ContractSigner,
} from "smart-account-kit";
import type { ResolvedSembolConfig } from "../types";

/** What kind of signer a rule entry is, from Sembol's UX point of view. */
export type SignerKind = "passkey" | "ed25519" | "wallet" | "contract" | "unknown";

/** One signer on the account, enriched for display. */
export interface SignerInfo {
  /** The raw on-chain signer (pass back to remove/policy APIs). */
  signer: ContractSigner;
  /** Context rule this entry belongs to. */
  ruleId: number;
  /** Stable client-side key (kit's canonical signer key). */
  key: string;
  kind: SignerKind;
  /** Short human-readable identifier (truncated key/address). */
  display: string;
  /** User-given nickname, when one was stored on this browser. */
  nickname?: string;
  /** True when this signer is the currently-connected passkey. */
  isActive: boolean;
  /** Base64URL credential ID for passkey signers. */
  credentialId?: string;
}

/**
 * Classify a signer by comparing External verifier addresses against the
 * configured WebAuthn / Ed25519 verifiers.
 */
export function signerKind(signer: ContractSigner, config: ResolvedSembolConfig): SignerKind {
  if (signer.tag === "Delegated") {
    const address = signer.values[0];
    if (typeof address === "string" && address.startsWith("C")) return "contract";
    return "wallet";
  }
  if (signer.tag === "External") {
    const verifier = signer.values[0];
    if (verifier === config.webauthnVerifierAddress) return "passkey";
    if (config.ed25519VerifierAddress && verifier === config.ed25519VerifierAddress) {
      return "ed25519";
    }
    return "unknown";
  }
  return "unknown";
}

/** The account's Default context rule (the one the primary passkey lives on). */
export function findDefaultRule(rules: ContextRule[]): ContextRule | null {
  const defaults = rules.filter((rule) => rule.context_type.tag === "Default");
  if (defaults.length === 0) return null;
  return defaults.reduce((lowest, rule) => (rule.id < lowest.id ? rule : lowest));
}

const NICKNAME_STORE_PREFIX = "sembol:signer-names:";

function nicknameStore(contractId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(NICKNAME_STORE_PREFIX + contractId);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Persist a display nickname for a signer (browser-local, per contract). */
export function saveSignerNickname(contractId: string, signerKey: string, nickname: string): void {
  try {
    const store = nicknameStore(contractId);
    store[signerKey] = nickname;
    localStorage.setItem(NICKNAME_STORE_PREFIX + contractId, JSON.stringify(store));
  } catch {
    /* private mode / quota - display falls back to the derived label */
  }
}

/** Flatten a rule's signers into display-ready entries. */
export function toSignerInfos(
  rule: ContextRule,
  config: ResolvedSembolConfig,
  contractId: string | null,
  activeCredentialId: string | null,
): SignerInfo[] {
  const nicknames = contractId ? nicknameStore(contractId) : {};
  return rule.signers.map((signer) => {
    const key = getSignerKey(signer);
    const credentialId = getCredentialIdFromSigner(signer) ?? undefined;
    const { display } = formatSignerForDisplay(signer);
    return {
      signer,
      ruleId: rule.id,
      key,
      kind: signerKind(signer, config),
      display,
      nickname: nicknames[key],
      isActive: Boolean(credentialId && activeCredentialId && credentialId === activeCredentialId),
      credentialId,
    };
  });
}
