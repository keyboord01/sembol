import { useCallback, useEffect, useRef, useState } from "react";
import { usePasskeyWalletContext } from "../context";
import { SembolError, toSembolError } from "../errors";
import { listDefaultRules, type SignerInfo } from "../internal/security";

export type RemoveSignerStatus = "idle" | "signing" | "submitting" | "success" | "error";

export interface UseRemoveSignerResult {
  /**
   * Remove a signer from its context rule. Refuses to remove the last signer
   * of the rule (`last_signer` error) - that would permanently lock the
   * account out.
   */
  removeSigner: (target: SignerInfo) => Promise<void>;
  status: RemoveSignerStatus;
  error: SembolError | null;
  reset: () => void;
}

/** Headless signer removal with a lockout guard. */
export function useRemoveSigner(): UseRemoveSignerResult {
  const { kit, signals } = usePasskeyWalletContext();
  const [status, setStatus] = useState<RemoveSignerStatus>("idle");
  const [error, setError] = useState<SembolError | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const removeSigner = useCallback(
    async (target: SignerInfo) => {
      if (!kit || !kit.isConnected) {
        const err = new SembolError("wallet_not_connected");
        setError(err);
        setStatus("error");
        throw err;
      }
      setError(null);
      setStatus("signing");
      const off = signals.on((signal) => {
        if (signal === "webauthn:done" && mounted.current) {
          setStatus((s) => (s === "signing" ? "submitting" : s));
        }
      });
      try {
        // Re-read at action time - the cached list may be stale.
        const rules = await kit.rules.list();
        const rule = rules.find((candidate) => candidate.id === target.ruleId);
        if (!rule) {
          throw new SembolError("invalid_input", `Context rule ${target.ruleId} no longer exists`);
        }
        // Lockout guard: never drop the account's final authorization signer.
        const totalAuthSigners = listDefaultRules(rules).reduce(
          (sum, candidate) => sum + candidate.signers.length,
          0,
        );
        if (rule.context_type.tag === "Default" && totalAuthSigners <= 1) {
          throw new SembolError("last_signer");
        }
        // Signers live on their own single-signer Default rules - removing
        // the signer means removing its rule. (For multi-signer rules built
        // outside Sembol, fall back to removing just the signer.)
        const transaction =
          rule.context_type.tag === "Default" && rule.signers.length === 1
            ? await kit.rules.remove(rule.id)
            : await kit.signers.remove(target.ruleId, target.signer);
        const result = await kit.signAndSubmit(transaction);
        if (!result.success) throw toSembolError(result.error);
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
    [kit, signals],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { removeSigner, status, error, reset };
}
