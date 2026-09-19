import { useCallback, useEffect, useRef, useState } from "react";
import { StrKey } from "@stellar/stellar-sdk";
import {
  createDefaultContext,
  createEd25519Signer,
  type ContextRule,
  type ContextRuleType,
  type ContractSigner,
} from "smart-account-kit";
import { usePasskeyWalletContext } from "../context";
import { SembolError, toSembolError } from "../errors";
import { periodToLedgers, type PolicyPeriod } from "../internal/policy";
import { listDefaultRules, toRuleName } from "../internal/security";

export type AgentPermissionStatus = "idle" | "signing" | "submitting" | "success" | "error";

/** One agent grant: a context rule whose only signers are Ed25519 keys held by software, never a passkey. */
export interface AgentGrant {
  ruleId: number;
  name: string;
  /** Agent public keys on the rule, as G-addresses. */
  agentPublicKeys: string[];
  /** Policy contracts attached to the rule. Empty means the agent is unrestricted. */
  policies: string[];
  /** True when the rule has no policy: the agent can do anything the account can. */
  unrestricted: boolean;
  contextType: ContextRuleType;
  /** Ledger sequence after which the rule stops authorizing, if the grant expires. */
  validUntil: number | null;
  /** Ledgers left until expiry (about 5 s each), null when the grant never expires or the ledger is unknown. */
  ledgersLeft: number | null;
}

export interface GrantAgentParams {
  /** The agent's Ed25519 public key: a G-address, 64 hex characters, or the raw 32 bytes. */
  agentPublicKey: string | Uint8Array;
  /**
   * Policy contracts that gate every action the agent takes: address -> install params (an `xdr.ScVal` for custom
   * policies, or whatever `kit.convertPolicyParams` produced for the built-in ones). Required: a rule with only an
   * agent signer and no policy grants full control of the account. Pass `allowUnrestricted: true` to do that anyway.
   */
  policies: Map<string, unknown>;
  /** Rule name, at most 20 UTF-8 bytes. @default "agent" */
  name?: string;
  /** When the rule applies. @default createDefaultContext() (any call) */
  contextType?: ContextRuleType;
  /** How long the grant lasts. Ignored when `validUntilLedger` is given. @default { days: 1 } */
  validFor?: PolicyPeriod;
  /** Explicit expiry ledger. */
  validUntilLedger?: number;
  /** Grant without a policy (dangerous). @default false */
  allowUnrestricted?: boolean;
}

export interface UseAgentPermissionResult {
  /** Active agent grants on the connected account. */
  grants: AgentGrant[];
  isLoading: boolean;
  /** Add an agent rule: one passkey approval. Resolves with the new rule id. */
  grant: (params: GrantAgentParams) => Promise<{ ruleId: number; hash: string }>;
  /** Remove an agent rule: the agent loses access in the same ledger. */
  revoke: (ruleId: number) => Promise<{ hash: string }>;
  status: AgentPermissionStatus;
  error: SembolError | null;
  refresh: () => Promise<void>;
  reset: () => void;
}

/** Normalize an Ed25519 public key given as G-address, hex, or bytes to 32 raw bytes. */
export function agentKeyBytes(key: string | Uint8Array): Uint8Array {
  if (key instanceof Uint8Array) {
    if (key.length !== 32) throw new SembolError("invalid_input", "Agent public key must be 32 bytes");
    return key;
  }
  const trimmed = key.trim();
  if (StrKey.isValidEd25519PublicKey(trimmed)) return new Uint8Array(StrKey.decodeEd25519PublicKey(trimmed));
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return new Uint8Array(trimmed.match(/../g)!.map((b) => Number.parseInt(b, 16)));
  }
  throw new SembolError("invalid_input", "Agent public key must be a G-address, 64 hex characters, or 32 bytes");
}

type StrKeyInput = Parameters<typeof StrKey.encodeEd25519PublicKey>[0];
const encodeG = (bytes: Uint8Array): string => StrKey.encodeEd25519PublicKey(bytes as unknown as StrKeyInput);

function isAgentSigner(signer: ContractSigner, ed25519Verifier: string | undefined): boolean {
  return signer.tag === "External" && Boolean(ed25519Verifier) && signer.values[0] === ed25519Verifier;
}

function toGAddress(signer: ContractSigner): string {
  const raw = signer.values[1] as Uint8Array | { data?: number[] } | undefined;
  const bytes = raw instanceof Uint8Array ? raw : new Uint8Array((raw as { data?: number[] } | undefined)?.data ?? []);
  return bytes.length === 32 ? encodeG(bytes) : "unknown";
}

/**
 * Rules that belong to an agent: every signer is an Ed25519 external signer against the configured verifier and
 * none is a passkey. A rule that mixes an agent key with a passkey is a co-signing rule, not a grant.
 */
export function findAgentRules(rules: ContextRule[], ed25519Verifier: string | undefined): ContextRule[] {
  return rules
    .filter((rule) => rule.signers.length > 0 && rule.signers.every((s) => isAgentSigner(s, ed25519Verifier)))
    .sort((a, b) => a.id - b.id);
}

/**
 * Grant a software agent (a keeper, a bot, an AI) scoped access to the connected smart account, list what it may
 * do, and revoke it.
 *
 * The grant is a context rule whose signer is the agent's Ed25519 key and whose policies decide, on-chain, which
 * calls that key may authorize. Sembol never holds the agent's secret: the app passes only the public key, and the
 * agent signs its own transactions elsewhere (see smart-account-kit's `Ed25519Signer`). Revoking removes the rule;
 * nothing the agent signed afterwards is accepted by the account.
 */
export function useAgentPermission(): UseAgentPermissionResult {
  const { kit, status: walletStatus, credentialId, config, signals, txEpoch } = usePasskeyWalletContext();
  const [grants, setGrants] = useState<AgentGrant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<AgentPermissionStatus>("idle");
  const [error, setError] = useState<SembolError | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!kit || walletStatus !== "connected") {
      setGrants([]);
      return;
    }
    setIsLoading(true);
    try {
      const rules = await kit.rules.list();
      let ledger: number | null = null;
      try {
        const latest = await (kit.rpc as { getLatestLedger?: () => Promise<{ sequence: number }> }).getLatestLedger?.();
        ledger = latest?.sequence ?? null;
      } catch {
        ledger = null;
      }
      if (!mounted.current) return;
      setGrants(
        findAgentRules(rules, config.ed25519VerifierAddress).map((rule) => {
          const validUntil = rule.valid_until === undefined || rule.valid_until === null ? null : Number(rule.valid_until);
          return {
            ruleId: rule.id,
            name: rule.name,
            agentPublicKeys: rule.signers.map(toGAddress),
            policies: [...rule.policies],
            unrestricted: rule.policies.length === 0,
            contextType: rule.context_type,
            validUntil,
            ledgersLeft: validUntil !== null && ledger !== null ? Math.max(0, validUntil - ledger) : null,
          };
        }),
      );
      setError(null);
    } catch (err) {
      if (mounted.current) setError(toSembolError(err));
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, [kit, walletStatus, config.ed25519VerifierAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh, txEpoch]);

  const run = useCallback(
    async <T,>(work: () => Promise<T>): Promise<T> => {
      setError(null);
      setStatus("signing");
      const off = signals.on((signal) => {
        if (signal === "webauthn:done" && mounted.current) {
          setStatus((s) => (s === "signing" ? "submitting" : s));
        }
      });
      try {
        const out = await work();
        signals.emit("tx:submitted");
        if (mounted.current) setStatus("success");
        return out;
      } catch (err) {
        const sembolError = toSembolError(err);
        if (mounted.current) {
          setError(sembolError);
          setStatus("error");
        }
        throw sembolError;
      } finally {
        off();
      }
    },
    [signals],
  );

  const submitTx = useCallback(
    async (transaction: unknown): Promise<string> => {
      if (!kit) throw new SembolError("wallet_not_connected");
      const result = await kit.signAndSubmit(transaction as Parameters<typeof kit.signAndSubmit>[0]);
      if (!result.success) throw toSembolError(result.error);
      return result.hash;
    },
    [kit],
  );

  const grant = useCallback(
    async (params: GrantAgentParams) => {
      if (!kit || !kit.isConnected) throw new SembolError("wallet_not_connected");
      const verifier = config.ed25519VerifierAddress;
      if (!verifier) {
        throw new SembolError(
          "invalid_input",
          "ed25519VerifierAddress is not configured - use a network artifact preset or set it explicitly",
        );
      }
      if (params.policies.size === 0 && !params.allowUnrestricted) {
        throw new SembolError(
          "invalid_input",
          "Refusing to grant an agent without a policy: it would control the whole account. Pass allowUnrestricted: true to override.",
        );
      }
      const keyBytes = agentKeyBytes(params.agentPublicKey);
      const signer = createEd25519Signer(verifier, keyBytes);
      const name = toRuleName(params.name, "agent");
      const contextType = params.contextType ?? createDefaultContext();
      let validUntil = params.validUntilLedger;
      if (validUntil === undefined) {
        const ledgers = periodToLedgers(params.validFor ?? { days: 1 });
        if (ledgers <= 0) throw new SembolError("invalid_input", "validFor must be greater than zero");
        const latest = await (kit.rpc as { getLatestLedger?: () => Promise<{ sequence: number }> }).getLatestLedger?.();
        if (!latest) throw new SembolError("invalid_input", "Could not read the current ledger to compute the expiry");
        validUntil = latest.sequence + ledgers;
      }
      const hash = await run(async () => {
        const transaction = await kit.rules.add(contextType, name, [signer], params.policies, validUntil);
        return submitTx(transaction);
      });
      await refresh();
      const rules = await kit.rules.list();
      const created = findAgentRules(rules, verifier).find(
        (rule) => rule.name === name && rule.signers.some((s) => toGAddress(s) === encodeG(keyBytes)),
      );
      const ruleId = created?.id ?? Math.max(-1, ...rules.map((r) => r.id));
      return { ruleId, hash };
    },
    [kit, config.ed25519VerifierAddress, credentialId, run, submitTx, refresh],
  );

  const revoke = useCallback(
    async (ruleId: number) => {
      if (!kit || !kit.isConnected) throw new SembolError("wallet_not_connected");
      const rules = await kit.rules.list();
      const target = rules.find((rule) => rule.id === ruleId);
      if (!target) throw new SembolError("policy_not_found", `Rule ${ruleId} does not exist on this account`);
      if (!findAgentRules([target], config.ed25519VerifierAddress).length) {
        throw new SembolError("invalid_input", `Rule ${ruleId} is not an agent grant; use useRemoveSigner for signers`);
      }
      const hash = await run(async () => submitTx(await kit.rules.remove(ruleId)));
      await refresh();
      return { hash };
    },
    [kit, config.ed25519VerifierAddress, run, submitTx, refresh],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { grants, isLoading, grant, revoke, status, error, refresh, reset };
}

/** Re-exported for adopters that build their own summary from a Default rule list. */
export { listDefaultRules };
