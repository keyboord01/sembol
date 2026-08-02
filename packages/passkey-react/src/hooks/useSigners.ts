import { useCallback, useEffect, useRef, useState } from "react";
import type { ContextRule } from "smart-account-kit";
import { usePasskeyWalletContext } from "../context";
import { SembolError, toSembolError } from "../errors";
import { findActiveSigner, listDefaultRules, toSignerInfos, type SignerInfo } from "../internal/security";

export interface UseSignersResult {
  /**
   * The account's authorization signers, across every Default-type rule.
   * Each additional signer lives on its own single-signer rule (any-of-N).
   */
  signers: SignerInfo[];
  /** Every context rule on the account, for advanced consumers. */
  rules: ContextRule[];
  /** The rule id the connected credential belongs to, when known. */
  activeRuleId: number | null;
  isLoading: boolean;
  error: SembolError | null;
  /** Re-read from chain/indexer (also happens automatically after every submitted tx). */
  refresh: () => Promise<void>;
}

/**
 * Live view of the connected account's signers.
 *
 * Reads the account's context rules (indexer-backed, with the kit's on-chain
 * probe as fallback) and flattens the Default rule's signers into
 * display-ready entries. Refreshes after every Sembol-submitted transaction.
 */
export function useSigners(): UseSignersResult {
  const { kit, status, address, credentialId, config, txEpoch } = usePasskeyWalletContext();
  const [signers, setSigners] = useState<SignerInfo[]>([]);
  const [rules, setRules] = useState<ContextRule[]>([]);
  const [activeRuleId, setActiveRuleId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<SembolError | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!kit || status !== "connected") {
      setSigners([]);
      setRules([]);
      setActiveRuleId(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const allRules = await kit.rules.list();
      if (!mounted.current) return;
      setRules(allRules);
      setActiveRuleId(findActiveSigner(allRules, credentialId)?.rule.id ?? null);
      setSigners(
        listDefaultRules(allRules).flatMap((rule) =>
          toSignerInfos(rule, config, address, credentialId),
        ),
      );
    } catch (err) {
      if (mounted.current) setError(toSembolError(err));
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, [kit, status, address, credentialId, config]);

  useEffect(() => {
    void refresh();
  }, [refresh, txEpoch]);

  return { signers, rules, activeRuleId, isLoading, error, refresh };
}
