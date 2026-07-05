import { useCallback, useEffect, useRef, useState } from "react";
import { usePasskeyWalletContext } from "../context";
import { toSembolError, type SembolError } from "../errors";
import type { CreateWalletOptions } from "../types";

export type CreateWalletStatus = "idle" | "creating" | "success" | "error";

/**
 * Sub-step of the creation flow, for progress UI:
 * `passkey` → OS passkey prompt, `deploying` → on-chain deployment,
 * `funding` → Friendbot top-up (testnet only).
 */
export type CreateWalletPhase = "passkey" | "deploying" | "funding" | null;

export interface UseCreateWalletResult {
  createWallet: (
    options?: CreateWalletOptions,
  ) => Promise<{ contractId: string; credentialId: string }>;
  status: CreateWalletStatus;
  phase: CreateWalletPhase;
  error: SembolError | null;
  /** Contract + credential of the created wallet after success. */
  result: { contractId: string; credentialId: string } | null;
  reset: () => void;
}

/** Headless wallet-creation flow with per-phase progress. */
export function useCreateWallet(): UseCreateWalletResult {
  const { kit, createWallet: contextCreate } = usePasskeyWalletContext();
  const [status, setStatus] = useState<CreateWalletStatus>("idle");
  const [phase, setPhase] = useState<CreateWalletPhase>(null);
  const [error, setError] = useState<SembolError | null>(null);
  const [result, setResult] = useState<{ contractId: string; credentialId: string } | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const createWallet = useCallback(
    async (options?: CreateWalletOptions) => {
      setStatus("creating");
      setPhase("passkey");
      setError(null);
      setResult(null);

      // The kit performs passkey → deploy → fund inside one call; its events
      // let us surface phase transitions without changing the call shape.
      const unsubscribers: Array<() => void> = [];
      if (kit) {
        unsubscribers.push(
          kit.events.once("credentialCreated", () => {
            if (mounted.current) setPhase("deploying");
          }),
          kit.events.once("transactionSubmitted", () => {
            if (mounted.current) setPhase("funding");
          }),
        );
      }

      try {
        const created = await contextCreate(options);
        if (mounted.current) {
          setResult(created);
          setStatus("success");
          setPhase(null);
        }
        return created;
      } catch (err) {
        const sembolError = toSembolError(err);
        if (mounted.current) {
          setError(sembolError);
          setStatus("error");
          setPhase(null);
        }
        throw sembolError;
      } finally {
        unsubscribers.forEach((off) => off());
      }
    },
    [kit, contextCreate],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setPhase(null);
    setError(null);
    setResult(null);
  }, []);

  return { createWallet, status, phase, error, result, reset };
}
