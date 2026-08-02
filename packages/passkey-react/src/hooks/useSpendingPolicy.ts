import { useCallback, useEffect, useRef, useState } from "react";
import {
  createCallContractContext,
  createSpendingLimitParams,
  getCredentialIdFromSigner,
  type ContextRule,
} from "smart-account-kit";
import { usePasskeyWalletContext } from "../context";
import { SembolError, toSembolError } from "../errors";
import { parseTokenAmount } from "../format";
import {
  describeLedgerPeriod,
  findSpendingPolicyRule,
  periodToLedgers,
  type PolicyPeriod,
} from "../internal/policy";
import { findDefaultRule } from "../internal/security";
import { resolveToken } from "../internal/tokens";
import type { TokenRef } from "../types";

export type SpendingPolicyStatus = "idle" | "signing" | "submitting" | "success" | "error";

/** Current spending-limit state for the watched token. */
export interface SpendingPolicyState {
  ruleId: number;
  /** Token contract the limit is scoped to. */
  tokenContract: string;
  /** Limit per window, in stroops (7-decimal base units). */
  limit: bigint;
  /** Amount already spent inside the current rolling window (stroops). */
  spent: bigint;
  /** Remaining allowance in the current window (stroops, never negative). */
  remaining: bigint;
  /** Window length in ledgers (~5s each). */
  periodLedgers: number;
  /** Human description of the window, e.g. "~1 day". */
  periodLabel: string;
}

export interface SetSpendingLimitParams {
  /** Limit per window, in token units (e.g. `"25"` = 25 XLM). */
  limit: string | number;
  /** Window length. Defaults to one day. */
  period?: PolicyPeriod;
  /** Token to scope the limit to. @default "native" (XLM) */
  token?: TokenRef;
}

export interface UseSpendingPolicyResult {
  /** Current limit for the watched token, or null when none is set. */
  policy: SpendingPolicyState | null;
  isLoading: boolean;
  /**
   * Create or update the spending limit. Creating installs a token-scoped
   * rule (with the connected signer) carrying the spending-limit policy; a
   * period change re-installs the policy (two passkey approvals).
   */
  setLimit: (params: SetSpendingLimitParams) => Promise<void>;
  /** Remove the limit (drops the token-scoped rule). */
  removeLimit: () => Promise<void>;
  status: SpendingPolicyStatus;
  error: SembolError | null;
  refresh: () => Promise<void>;
  reset: () => void;
}

/**
 * Per-signer spending limits backed by the deployed spending-limit policy
 * contract (`spendingLimitPolicyAddress` in the config / network presets).
 *
 * Enforcement note: limits bind to transfers built as direct token
 * invocations - which is how Sembol sends payments. smart-account-kit@0.4.2's
 * own `kit.transfer()` wraps transfers in `execute` and is NOT covered until
 * the kit's next release.
 */
export function useSpendingPolicy(token: TokenRef = "native"): UseSpendingPolicyResult {
  const { kit, status: walletStatus, credentialId, config, signals, txEpoch } =
    usePasskeyWalletContext();
  const [policy, setPolicy] = useState<SpendingPolicyState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<SpendingPolicyStatus>("idle");
  const [error, setError] = useState<SembolError | null>(null);
  const mounted = useRef(true);

  const policyAddress = config.spendingLimitPolicyAddress;
  const tokenContract = resolveToken(token, config).contractId;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const requirePolicyAddress = useCallback(() => {
    if (!policyAddress) {
      throw new SembolError(
        "invalid_input",
        "spendingLimitPolicyAddress is not configured - use a network artifact preset or set it explicitly",
      );
    }
    return policyAddress;
  }, [policyAddress]);

  const refresh = useCallback(async () => {
    if (!kit || walletStatus !== "connected" || !policyAddress) {
      setPolicy(null);
      return;
    }
    setIsLoading(true);
    try {
      const rules = await kit.rules.list();
      const rule = findSpendingPolicyRule(rules, tokenContract, policyAddress, credentialId);
      if (!rule) {
        if (mounted.current) setPolicy(null);
        return;
      }
      const data = await kit.policyClients.spendingLimit(policyAddress).getSpendingLimitData(rule.id);
      if (!mounted.current) return;
      const spent = data.cached_total_spent;
      const remaining = data.spending_limit > spent ? data.spending_limit - spent : 0n;
      setPolicy({
        ruleId: rule.id,
        tokenContract,
        limit: data.spending_limit,
        spent,
        remaining,
        periodLedgers: data.period_ledgers,
        periodLabel: describeLedgerPeriod(data.period_ledgers),
      });
      setError(null);
    } catch (err) {
      if (mounted.current) setError(toSembolError(err));
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, [kit, walletStatus, credentialId, policyAddress, tokenContract]);

  useEffect(() => {
    void refresh();
  }, [refresh, txEpoch]);

  const submitTx = useCallback(
    async (transaction: unknown) => {
      if (!kit) throw new SembolError("wallet_not_connected");
      const result = await kit.signAndSubmit(
        transaction as Parameters<typeof kit.signAndSubmit>[0],
      );
      if (!result.success) throw toSembolError(result.error);
    },
    [kit],
  );

  const run = useCallback(
    async (work: () => Promise<void>) => {
      setError(null);
      setStatus("signing");
      const off = signals.on((signal) => {
        if (signal === "webauthn:done" && mounted.current) {
          setStatus((s) => (s === "signing" ? "submitting" : s));
        }
      });
      try {
        await work();
        signals.emit("tx:submitted");
        if (mounted.current) setStatus("success");
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

  const setLimit = useCallback(
    async ({ limit, period, token: tokenOverride }: SetSpendingLimitParams) => {
      if (!kit || !kit.isConnected) throw new SembolError("wallet_not_connected");
      const address = requirePolicyAddress();
      const targetToken = tokenOverride
        ? resolveToken(tokenOverride, config).contractId
        : tokenContract;

      let limitStroops: bigint;
      try {
        limitStroops = parseTokenAmount(limit, 7);
        if (limitStroops <= 0n) throw new Error("Limit must be positive");
      } catch (err) {
        throw new SembolError(
          "invalid_input",
          err instanceof Error ? err.message : "Invalid limit",
          err,
        );
      }
      const periodLedgers = periodToLedgers(period ?? { days: 1 });
      if (periodLedgers <= 0) {
        throw new SembolError("invalid_input", "Period must be greater than zero");
      }

      await run(async () => {
        const rules = await kit.rules.list();
        const existing = findSpendingPolicyRule(rules, targetToken, address, credentialId);

        if (!existing) {
          // New limit: one token-scoped rule holding the connected signer +
          // the spending-limit policy.
          const defaultRule = findDefaultRule(rules);
          const activeSigner = defaultRule?.signers.find(
            (signer) => getCredentialIdFromSigner(signer) === credentialId,
          );
          if (!activeSigner) {
            throw new SembolError(
              "invalid_input",
              "Could not find the connected passkey among the account's signers",
            );
          }
          const installParams = kit.convertPolicyParams(
            "spending_limit",
            createSpendingLimitParams(limitStroops, periodLedgers),
          );
          const transaction = await kit.rules.add(
            createCallContractContext(targetToken),
            "Spending limit",
            [activeSigner],
            new Map([[address, installParams as unknown]]),
          );
          await submitTx(transaction);
          return;
        }

        const client = kit.policyClients.spendingLimit(address);
        const current = await client.getSpendingLimitData(existing.id);
        if (current.period_ledgers !== periodLedgers) {
          // Period change: the typed client has no period setter - re-install
          // the policy on the same rule (two approvals).
          await submitTx(await kit.policies.remove(existing.id, address));
          const installParams = kit.convertPolicyParams(
            "spending_limit",
            createSpendingLimitParams(limitStroops, periodLedgers),
          );
          await submitTx(await kit.policies.add(existing.id, address, installParams));
          return;
        }

        // Limit-only change: single setter call through the account.
        const { result: rule } = await kit.rules.get(existing.id);
        await submitTx(await client.setSpendingLimit(limitStroops, rule as ContextRule));
      });
      await refresh();
    },
    [kit, config, credentialId, tokenContract, requirePolicyAddress, run, submitTx, refresh],
  );

  const removeLimit = useCallback(async () => {
    if (!kit || !kit.isConnected) throw new SembolError("wallet_not_connected");
    const address = requirePolicyAddress();
    await run(async () => {
      const rules = await kit.rules.list();
      const existing = findSpendingPolicyRule(rules, tokenContract, address, credentialId);
      if (!existing) throw new SembolError("policy_not_found");
      await submitTx(await kit.rules.remove(existing.id));
    });
    await refresh();
  }, [kit, credentialId, tokenContract, requirePolicyAddress, run, submitTx, refresh]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { policy, isLoading, setLimit, removeLimit, status, error, refresh, reset };
}
