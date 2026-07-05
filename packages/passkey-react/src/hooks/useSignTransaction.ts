import { useCallback, useEffect, useRef, useState } from "react";
import type { AssembledTransaction, TransactionResult } from "smart-account-kit";
import { usePasskeyWalletContext } from "../context";
import { SembolError, toSembolError } from "../errors";

export type SignStatus = "idle" | "signing" | "submitting" | "success" | "error";

export interface SignOptions {
  /** Credential ID to sign with (defaults to the connected credential). */
  credentialId?: string;
  /** Signature expiration ledger. */
  expiration?: number;
  /** Force a submission method (`"relayer"` or `"rpc"`). */
  forceMethod?: "relayer" | "rpc";
}

export interface UseSignTransactionResult {
  /**
   * Sign auth entries only — no re-simulation, no submission. The returned
   * transaction is NOT ready for direct RPC submission (WebAuthn signatures
   * change resource fees); prefer {@link signAndSubmit}.
   */
  sign: <T>(
    transaction: AssembledTransaction<T>,
    options?: Pick<SignOptions, "credentialId" | "expiration">,
  ) => Promise<AssembledTransaction<T>>;
  /** Sign → re-simulate → submit. The recommended path. */
  signAndSubmit: <T>(
    transaction: AssembledTransaction<T>,
    options?: SignOptions,
  ) => Promise<TransactionResult>;
  status: SignStatus;
  error: SembolError | null;
  /** Submission result after `signAndSubmit` succeeds. */
  result: TransactionResult | null;
  reset: () => void;
}

/** Headless transaction signing/submission with a status machine. */
export function useSignTransaction(): UseSignTransactionResult {
  const { kit } = usePasskeyWalletContext();
  const [status, setStatus] = useState<SignStatus>("idle");
  const [error, setError] = useState<SembolError | null>(null);
  const [result, setResult] = useState<TransactionResult | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const requireKit = useCallback(() => {
    if (!kit) throw new SembolError("wallet_not_connected", "Wallet is still initializing");
    if (!kit.isConnected) throw new SembolError("wallet_not_connected");
    return kit;
  }, [kit]);

  const sign = useCallback(
    async <T,>(
      transaction: AssembledTransaction<T>,
      options?: Pick<SignOptions, "credentialId" | "expiration">,
    ) => {
      const instance = requireKit();
      setStatus("signing");
      setError(null);
      try {
        const signed = await instance.sign(transaction, options);
        if (mounted.current) setStatus("success");
        return signed;
      } catch (err) {
        const sembolError = toSembolError(err);
        if (mounted.current) {
          setError(sembolError);
          setStatus("error");
        }
        throw sembolError;
      }
    },
    [requireKit],
  );

  const signAndSubmit = useCallback(
    async <T,>(transaction: AssembledTransaction<T>, options?: SignOptions) => {
      const instance = requireKit();
      setStatus("signing");
      setError(null);
      setResult(null);
      // Flip to "submitting" once the passkey ceremony completes.
      const offSigned = instance.events.once("transactionSigned", () => {
        if (mounted.current) setStatus((s) => (s === "signing" ? "submitting" : s));
      });
      try {
        const txResult = await instance.signAndSubmit(transaction, options);
        if (!txResult.success) {
          throw new SembolError(
            "submission_failed",
            txResult.error ?? `Transaction ${txResult.hash} failed`,
            txResult,
          );
        }
        if (mounted.current) {
          setResult(txResult);
          setStatus("success");
        }
        return txResult;
      } catch (err) {
        const sembolError = toSembolError(err);
        if (mounted.current) {
          setError(sembolError);
          setStatus("error");
        }
        throw sembolError;
      } finally {
        offSigned();
      }
    },
    [requireKit],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setResult(null);
  }, []);

  return { sign, signAndSubmit, status, error, result, reset };
}
