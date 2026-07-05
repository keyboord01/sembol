import { useCallback, useEffect, useRef, useState } from "react";
import type { TransactionResult } from "smart-account-kit";
import { usePasskeyWalletContext } from "../context";
import { SembolError, toSembolError } from "../errors";
import { parseTokenAmount } from "../format";
import { resolveToken } from "../internal/tokens";
import type { TokenRef } from "../types";

export type TransferStatus = "idle" | "signing" | "submitting" | "success" | "error";

export interface TransferParams {
  /** Recipient address (G… or C…). */
  to: string;
  /** Amount in token units, e.g. `"12.5"` or `12.5`. */
  amount: string | number;
  /** Token to send. @default "native" (XLM) */
  token?: TokenRef;
  /** Force a submission method. */
  forceMethod?: "relayer" | "rpc";
}

export interface UseTransferResult {
  /** Build, passkey-sign, and submit a token transfer from the connected wallet. */
  transfer: (params: TransferParams) => Promise<TransactionResult>;
  status: TransferStatus;
  error: SembolError | null;
  result: TransactionResult | null;
  reset: () => void;
}

/** Headless token-transfer flow (the whole send-payment path in one call). */
export function useTransfer(): UseTransferResult {
  const { kit, config } = usePasskeyWalletContext();
  const [status, setStatus] = useState<TransferStatus>("idle");
  const [error, setError] = useState<SembolError | null>(null);
  const [result, setResult] = useState<TransactionResult | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const transfer = useCallback(
    async ({ to, amount, token = "native", forceMethod }: TransferParams) => {
      if (!kit) throw new SembolError("wallet_not_connected", "Wallet is still initializing");
      if (!kit.isConnected) throw new SembolError("wallet_not_connected");
      if (!/^[GC][A-Z2-7]{55}$/.test(to.trim())) {
        const err = new SembolError("invalid_input", `"${to}" is not a valid Stellar address`);
        setError(err);
        setStatus("error");
        throw err;
      }

      const resolvedToken = resolveToken(token, config);
      const decimals = resolvedToken.decimals ?? 7;
      let numericAmount: number;
      try {
        // Validates format and decimal-place count; kit.transfer takes token units.
        parseTokenAmount(amount, decimals);
        numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
          throw new Error("Amount must be positive");
        }
      } catch (err) {
        const sembolError = new SembolError(
          "invalid_input",
          err instanceof Error ? err.message : "Invalid amount",
          err,
        );
        setError(sembolError);
        setStatus("error");
        throw sembolError;
      }

      setStatus("signing");
      setError(null);
      setResult(null);
      const offSigned = kit.events.once("transactionSigned", () => {
        if (mounted.current) setStatus((s) => (s === "signing" ? "submitting" : s));
      });
      try {
        const txResult = await kit.transfer(resolvedToken.contractId, to.trim(), numericAmount, {
          forceMethod,
        });
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
    [kit, config],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setResult(null);
  }, []);

  return { transfer, status, error, result, reset };
}
