import { useCallback, useEffect, useRef, useState } from "react";
import type { TransactionSuccess } from "smart-account-kit";
import { usePasskeyWalletContext } from "../context";
import { SembolError, toSembolError } from "../errors";
import { parseTokenAmount } from "../format";
import { readTokenMeta } from "../internal/balance";
import { resolveToken } from "../internal/tokens";
import { buildTransferTransaction } from "../transactions";
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
  transfer: (params: TransferParams) => Promise<TransactionSuccess>;
  status: TransferStatus;
  error: SembolError | null;
  result: TransactionSuccess | null;
  reset: () => void;
}

/**
 * Headless token-transfer flow (the whole send-payment path in one call).
 * Uses the token's real decimals - including non-7-decimal SEP-41 tokens,
 * whose metadata is read on-chain.
 */
export function useTransfer(): UseTransferResult {
  const { kit, config, signals } = usePasskeyWalletContext();
  const [status, setStatus] = useState<TransferStatus>("idle");
  const [error, setError] = useState<SembolError | null>(null);
  const [result, setResult] = useState<TransactionSuccess | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fail = useCallback((sembolError: SembolError) => {
    if (mounted.current) {
      setError(sembolError);
      setStatus("error");
    }
    return sembolError;
  }, []);

  const transfer = useCallback(
    async ({ to, amount, token = "native", forceMethod }: TransferParams) => {
      if (!kit) throw fail(new SembolError("wallet_not_connected", "Wallet is still initializing"));
      if (!kit.isConnected) throw fail(new SembolError("wallet_not_connected"));
      const recipient = to.trim();
      if (!/^[GC][A-Z2-7]{55}$/.test(recipient)) {
        throw fail(new SembolError("invalid_input", `"${to}" is not a valid Stellar address`));
      }

      setStatus("signing");
      setError(null);
      setResult(null);

      const resolvedToken = resolveToken(token, config);
      let decimals = resolvedToken.decimals;
      try {
        if (decimals === null) {
          // Arbitrary token contract - read its real decimals on-chain.
          decimals = (
            await readTokenMeta(
              kit.rpc,
              config.networkPassphrase,
              kit.deployerPublicKey,
              resolvedToken.contractId,
            )
          ).decimals;
        }
        const parsed = parseTokenAmount(amount, decimals);
        if (parsed <= 0n) throw new Error("Amount must be positive");
      } catch (err) {
        throw fail(
          new SembolError("invalid_input", err instanceof Error ? err.message : "Invalid amount", err),
        );
      }

      const offSignal = signals.on((signal) => {
        if (signal === "webauthn:done" && mounted.current) {
          setStatus((s) => (s === "signing" ? "submitting" : s));
        }
      });
      try {
        const transaction = await buildTransferTransaction(kit, {
          tokenContract: resolvedToken.contractId,
          to: recipient,
          amount,
          decimals,
        });
        const txResult = await kit.signAndSubmit(transaction, { forceMethod });
        if (!txResult.success) {
          // 0.4.x: TransactionFailure.error is a typed SmartAccountError
          // (possibly a decoded ContractError, e.g. a spending-limit rejection).
          throw toSembolError(txResult.error);
        }
        signals.emit("tx:submitted");
        if (mounted.current) {
          setResult(txResult);
          setStatus("success");
        }
        return txResult;
      } catch (err) {
        throw fail(toSembolError(err));
      } finally {
        offSignal();
      }
    },
    [kit, config, signals, fail],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setResult(null);
  }, []);

  return { transfer, status, error, result, reset };
}
