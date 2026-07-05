import { useCallback, useState } from "react";
import { usePasskeyWalletContext } from "../context";
import { toSembolError, type SembolError } from "../errors";
import type { ConnectOptions } from "../types";

export type ConnectStatus = "idle" | "connecting" | "success" | "error";

export interface UseConnectWalletResult {
  /** Prompt for a passkey and connect. Resolves null when no wallet was found silently. */
  connect: (options?: ConnectOptions) => Promise<{ contractId: string; credentialId: string } | null>;
  status: ConnectStatus;
  error: SembolError | null;
  reset: () => void;
}

/** Headless connect flow with its own status machine (for custom buttons). */
export function useConnectWallet(): UseConnectWalletResult {
  const { connect: contextConnect } = usePasskeyWalletContext();
  const [status, setStatus] = useState<ConnectStatus>("idle");
  const [error, setError] = useState<SembolError | null>(null);

  const connect = useCallback(
    async (options?: ConnectOptions) => {
      setStatus("connecting");
      setError(null);
      try {
        const result = await contextConnect(options);
        setStatus(result ? "success" : "idle");
        return result;
      } catch (err) {
        const sembolError = toSembolError(err);
        setError(sembolError);
        setStatus("error");
        throw sembolError;
      }
    },
    [contextConnect],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { connect, status, error, reset };
}
