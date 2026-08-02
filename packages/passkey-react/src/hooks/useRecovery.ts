import { useCallback, useEffect, useRef, useState } from "react";
import { usePasskeyWalletContext } from "../context";
import { SembolError, toSembolError } from "../errors";
import { useAddSigner, type AddSignerOptions } from "./useAddSigner";

export type RecoveryStatus =
  | "idle"
  | "enrolling"
  | "authenticating"
  | "discovering"
  | "connecting"
  | "choice"
  | "success"
  | "error";

export interface EnrollRecoveryParams {
  /** `"passkey"` registers a new passkey; `"ed25519"` adds a backup key you hold. */
  method: "passkey" | "ed25519";
  /** Friendly name shown in the signer list. @default "Recovery" */
  nickname?: string;
  /** Required for `"ed25519"`: the backup key's public key (G…). */
  publicKey?: string;
}

/** Result of a recovery attempt. */
export type RecoverOutcome =
  | { outcome: "connected"; contractId: string; credentialId: string }
  | {
      /** The passkey signs for several wallets - pick one and call `recover({ contractId })`. */
      outcome: "choose";
      credentialId: string;
      candidates: string[];
    };

export interface UseRecoveryResult {
  /**
   * Enroll a recovery credential on the connected wallet. Afterwards, show
   * the user their wallet address (`walletAddress`) and tell them to save it -
   * recovery on a brand-new browser may need it if discovery is unavailable.
   */
  enroll: (params: EnrollRecoveryParams) => Promise<{ credentialId?: string }>;
  /**
   * Recover access with an enrolled credential (fresh browser flow):
   * passkey prompt → wallet discovery (local map, then indexer) → reconnect.
   * Throws `recovery_needs_address` when the wallet can't be discovered -
   * retry with the saved address: `recover({ contractId })`.
   */
  recover: (options?: { contractId?: string }) => Promise<RecoverOutcome>;
  /** The connected wallet's address (surface this during enrollment). */
  walletAddress: string | null;
  status: RecoveryStatus;
  error: SembolError | null;
  reset: () => void;
}

/**
 * Recovery = an extra credential enrolled today + a reconnect path for the
 * day the primary device is gone.
 *
 * Discovery order on `recover()`: explicit `contractId` → this browser's
 * credential→wallet map → the public indexer → the deterministic address (the
 * original deploy credential only) → `recovery_needs_address`.
 */
export function useRecovery(): UseRecoveryResult {
  const { kit, address, connect } = usePasskeyWalletContext();
  const addSigner = useAddSigner();
  const [status, setStatus] = useState<RecoveryStatus>("idle");
  const [error, setError] = useState<SembolError | null>(null);
  const mounted = useRef(true);
  // The credential proved by the most recent recovery attempt. Retrying with
  // an explicit contractId (address fallback, candidate picker) reuses it so
  // the user is not asked for the same passkey twice in one flow.
  const provedCredentialRef = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fail = useCallback((err: unknown) => {
    const sembolError = toSembolError(err);
    if (mounted.current) {
      setError(sembolError);
      setStatus("error");
    }
    return sembolError;
  }, []);

  const enroll = useCallback(
    async ({ method, nickname, publicKey }: EnrollRecoveryParams) => {
      setError(null);
      setStatus("enrolling");
      const options: AddSignerOptions = { nickname: nickname ?? "Recovery" };
      try {
        if (method === "passkey") {
          const { credentialId } = await addSigner.addPasskey(options);
          if (mounted.current) setStatus("success");
          return { credentialId };
        }
        if (!publicKey) {
          throw new SembolError("invalid_input", "publicKey is required for an Ed25519 recovery key");
        }
        await addSigner.addEd25519(publicKey, options);
        if (mounted.current) setStatus("success");
        return {};
      } catch (err) {
        throw fail(err);
      }
    },
    [addSigner, fail],
  );

  const finishConnect = useCallback(
    async (contractId: string, credentialId: string) => {
      if (mounted.current) setStatus("connecting");
      const result = await connect({ contractId, credentialId });
      if (!result) throw new SembolError("wallet_not_found");
      if (mounted.current) setStatus("success");
      return {
        outcome: "connected" as const,
        contractId: result.contractId,
        credentialId: result.credentialId,
      };
    },
    [connect],
  );

  const recover = useCallback(
    async (options?: { contractId?: string }): Promise<RecoverOutcome> => {
      if (!kit) throw fail(new SembolError("unknown", "Wallet is still initializing"));
      setError(null);
      try {
        // A recovery retry that names the wallet (address fallback or the
        // candidate picker) reuses the credential the user proved moments
        // ago - one passkey ceremony per recovery, not one per step.
        let credentialId =
          options?.contractId && provedCredentialRef.current
            ? provedCredentialRef.current
            : null;
        if (!credentialId) {
          setStatus("authenticating");
          // Any resident passkey - no session or contract knowledge needed.
          ({ credentialId } = await kit.authenticatePasskey());
          provedCredentialRef.current = credentialId;
        }

        // 1. Explicit address (user pasted it after a failed discovery).
        if (options?.contractId) {
          return await finishConnect(options.contractId.trim(), credentialId);
        }

        // 2. This browser saw this credential before.
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(`sembol:wallet:${credentialId}`);
        } catch {
          /* private mode */
        }
        if (saved) {
          return await finishConnect(saved, credentialId);
        }

        // 3. Public indexer reverse lookup (best-effort - Mercury can be down).
        if (mounted.current) setStatus("discovering");
        let candidates: string[] = [];
        try {
          const contracts = await kit.discoverContractsByCredential(credentialId);
          candidates = (contracts ?? []).map((entry) => entry.contract_id);
        } catch {
          candidates = [];
        }
        const only = candidates.length === 1 ? candidates[0] : undefined;
        if (only) {
          return await finishConnect(only, credentialId);
        }
        if (candidates.length > 1) {
          if (mounted.current) setStatus("choice");
          return { outcome: "choose", credentialId, candidates };
        }

        // 4. Deterministic derivation - succeeds only when this credential
        //    originally deployed the wallet.
        try {
          const result = await connect({ credentialId });
          if (result) {
            if (mounted.current) setStatus("success");
            return { outcome: "connected", ...result };
          }
        } catch {
          /* fall through to the address prompt */
        }

        throw new SembolError("recovery_needs_address");
      } catch (err) {
        throw fail(err);
      }
    },
    [kit, connect, finishConnect, fail],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    provedCredentialRef.current = null;
    addSigner.reset();
  }, [addSigner]);

  return { enroll, recover, walletAddress: address, status, error, reset };
}
