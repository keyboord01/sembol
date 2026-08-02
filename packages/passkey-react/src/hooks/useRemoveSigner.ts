import { useCallback, useEffect, useRef, useState } from "react";
import { usePasskeyWalletContext } from "../context";
import { SembolError, toSembolError } from "../errors";
import type { SignerInfo } from "../internal/security";

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
        // Re-read the rule at action time - the cached list may be stale.
        const rules = await kit.rules.list();
        const rule = rules.find((candidate) => candidate.id === target.ruleId);
        if (!rule) {
          throw new SembolError("invalid_input", `Context rule ${target.ruleId} no longer exists`);
        }
        if (rule.signers.length <= 1) {
          throw new SembolError("last_signer");
        }
        const transaction = await kit.signers.remove(target.ruleId, target.signer);
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
