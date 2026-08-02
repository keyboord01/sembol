import { useCallback, useEffect, useRef, useState } from "react";
import type { ContextRule } from "smart-account-kit";
import { usePasskeyWalletContext } from "../context";
import { SembolError, toSembolError } from "../errors";
import { findDefaultRule, toSignerInfos, type SignerInfo } from "../internal/security";

export interface UseSignersResult {
  /** Signers on the account's Default rule (the primary authorization set). */
  signers: SignerInfo[];
  /** Every context rule on the account, for advanced consumers. */
  rules: ContextRule[];
  /** The Default rule's ID (add/remove operations target it). */
  defaultRuleId: number | null;
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
  const [defaultRuleId, setDefaultRuleId] = useState<number | null>(null);
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
      setDefaultRuleId(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const allRules = await kit.rules.list();
      const defaultRule = findDefaultRule(allRules);
      if (!mounted.current) return;
      setRules(allRules);
      setDefaultRuleId(defaultRule?.id ?? null);
      setSigners(defaultRule ? toSignerInfos(defaultRule, config, address, credentialId) : []);
    } catch (err) {
      if (mounted.current) setError(toSembolError(err));
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, [kit, status, address, credentialId, config]);

  useEffect(() => {
    void refresh();
  }, [refresh, txEpoch]);

  return { signers, rules, defaultRuleId, isLoading, error, refresh };
}
