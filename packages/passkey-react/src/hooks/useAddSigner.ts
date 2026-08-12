import { useCallback, useEffect, useRef, useState } from "react";
import { StrKey } from "@stellar/stellar-sdk";
import {
  createDefaultContext,
  createDelegatedSigner,
  createEd25519Signer,
  createWebAuthnSigner,
  getSignerKey,
  type ContractSigner,
} from "smart-account-kit";
import { usePasskeyWalletContext } from "../context";
import { SembolError, toSembolError } from "../errors";
import { saveSignerNickname, toRuleName } from "../internal/security";

export type AddSignerStatus =
  | "idle"
  | "registering"
  | "signing"
  | "submitting"
  | "success"
  | "error";

export interface AddSignerOptions {
  /** Friendly name shown in the signer list (stored on this browser). */
  nickname?: string;
}

export interface UseAddSignerResult {
  /**
   * Register a brand-new passkey on this (or another) device and add it as a
   * signer. Two prompts: create the new passkey, then approve with the
   * existing one.
   */
  addPasskey: (options?: AddSignerOptions) => Promise<{ credentialId: string }>;
  /** Add an Ed25519 key (G… public key) as a signer via the Ed25519 verifier. */
  addEd25519: (publicKey: string, options?: AddSignerOptions) => Promise<void>;
  /** Add an existing Stellar account (G…) as a delegated co-signer. */
  addWallet: (address: string, options?: AddSignerOptions) => Promise<void>;
  status: AddSignerStatus;
  error: SembolError | null;
  reset: () => void;
}

/**
 * Headless add-signer flows for passkeys, Ed25519 recovery keys, and
 * delegated Stellar accounts.
 *
 * Each added signer gets its OWN single-signer Default rule: a policy-less
 * rule requires all of its signers, so sharing one rule would force every
 * action to collect every signature. One rule per signer keeps any-of-N
 * semantics - any enrolled credential can act alone. Every path ends in one
 * passkey approval from the currently-connected signer.
 */
export function useAddSigner(): UseAddSignerResult {
  const { kit, config, signals } = usePasskeyWalletContext();
  const [status, setStatus] = useState<AddSignerStatus>("idle");
  const [error, setError] = useState<SembolError | null>(null);
  const mounted = useRef(true);

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

  const requireKit = useCallback(() => {
    if (!kit || !kit.isConnected) throw new SembolError("wallet_not_connected");
    return kit;
  }, [kit]);

  /** Create the signer's own Default rule and submit with the active passkey. */
  const submitOwnRule = useCallback(
    async (signer: ContractSigner, ruleName: string, nickname?: string) => {
      const instance = requireKit();
      setStatus("signing");
      const off = signals.on((signal) => {
        if (signal === "webauthn:done" && mounted.current) {
          setStatus((s) => (s === "signing" ? "submitting" : s));
        }
      });
      try {
        const transaction = await instance.rules.add(
          createDefaultContext(),
          ruleName,
          [signer],
          new Map(),
        );
        const result = await instance.signAndSubmit(transaction);
        if (!result.success) throw toSembolError(result.error);
        signals.emit("tx:submitted");
        if (nickname && instance.contractId) {
          saveSignerNickname(instance.contractId, getSignerKey(signer), nickname);
        }
      } finally {
        off();
      }
    },
    [requireKit, signals],
  );

  const addPasskey = useCallback(
    async (options?: AddSignerOptions) => {
      const instance = requireKit();
      setError(null);
      setStatus("registering");
      try {
        const nickname = options?.nickname?.trim() || undefined;
        // Registration only - no transaction yet. The credential is saved to
        // the kit's storage so this browser can sign with it later.
        const credential = await instance.credentials.create({
          nickname,
          appName: config.appName,
        });
        const signer = createWebAuthnSigner(
          config.webauthnVerifierAddress,
          credential.publicKey,
          credential.credentialId,
        );
        await submitOwnRule(signer, toRuleName(nickname, "signer"), nickname);
        if (mounted.current) setStatus("success");
        return { credentialId: credential.credentialId };
      } catch (err) {
        throw fail(err);
      }
    },
    [requireKit, submitOwnRule, config.appName, config.webauthnVerifierAddress, fail],
  );

  const addEd25519 = useCallback(
    async (publicKey: string, options?: AddSignerOptions) => {
      requireKit();
      setError(null);
      try {
        if (!config.ed25519VerifierAddress) {
          throw new SembolError(
            "invalid_input",
            "ed25519VerifierAddress is not configured - use a network artifact preset or set it explicitly",
          );
        }
        const trimmed = publicKey.trim();
        if (!StrKey.isValidEd25519PublicKey(trimmed)) {
          throw new SembolError("invalid_input", `"${publicKey}" is not a valid Stellar public key (G…)`);
        }
        const nickname = options?.nickname?.trim() || undefined;
        const signer = createEd25519Signer(
          config.ed25519VerifierAddress,
          StrKey.decodeEd25519PublicKey(trimmed),
        );
        await submitOwnRule(signer, toRuleName(nickname, "recovery key"), nickname);
        if (mounted.current) setStatus("success");
      } catch (err) {
        throw fail(err);
      }
    },
    [requireKit, submitOwnRule, config.ed25519VerifierAddress, fail],
  );

  const addWallet = useCallback(
    async (address: string, options?: AddSignerOptions) => {
      requireKit();
      setError(null);
      try {
        const trimmed = address.trim();
        if (!StrKey.isValidEd25519PublicKey(trimmed)) {
          throw new SembolError("invalid_input", `"${address}" is not a valid Stellar account (G…)`);
        }
        const nickname = options?.nickname?.trim() || undefined;
        await submitOwnRule(
          createDelegatedSigner(trimmed),
          toRuleName(nickname, "wallet"),
          nickname,
        );
        if (mounted.current) setStatus("success");
      } catch (err) {
        throw fail(err);
      }
    },
    [requireKit, submitOwnRule, fail],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { addPasskey, addEd25519, addWallet, status, error, reset };
}
