import { useCallback, useEffect, useRef, useState } from "react";
import { StrKey } from "@stellar/stellar-sdk";
import {
  createDelegatedSigner,
  createEd25519Signer,
  createWebAuthnSigner,
  getSignerKey,
  MAX_SIGNERS,
} from "smart-account-kit";
import { usePasskeyWalletContext } from "../context";
import { SembolError, toSembolError } from "../errors";
import { findDefaultRule, saveSignerNickname } from "../internal/security";

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
  /** Context rule to add to. Defaults to the account's Default rule. */
  ruleId?: number;
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
 * delegated Stellar accounts. Every path ends in one passkey approval from
 * the currently-connected signer.
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

  /** Resolve the target rule + enforce the contract's signer cap client-side. */
  const resolveRule = useCallback(
    async (ruleId?: number) => {
      const instance = requireKit();
      const rules = await instance.rules.list();
      const rule =
        ruleId !== undefined
          ? (rules.find((candidate) => candidate.id === ruleId) ?? null)
          : findDefaultRule(rules);
      if (!rule) {
        throw new SembolError(
          "invalid_input",
          ruleId !== undefined
            ? `No context rule with id ${ruleId} on this account`
            : "The account has no Default context rule",
        );
      }
      if (rule.signers.length >= MAX_SIGNERS) {
        throw new SembolError(
          "invalid_input",
          `This rule already has the maximum of ${MAX_SIGNERS} signers`,
        );
      }
      return rule;
    },
    [requireKit],
  );

  const watchCeremony = useCallback(() => {
    return signals.on((signal) => {
      if (signal === "webauthn:done" && mounted.current) {
        setStatus((s) => (s === "signing" ? "submitting" : s));
      }
    });
  }, [signals]);

  const submit = useCallback(
    async (transactionPromise: Promise<unknown>) => {
      const instance = requireKit();
      const transaction = await transactionPromise;
      setStatus("signing");
      const off = watchCeremony();
      try {
        const result = await instance.signAndSubmit(
          transaction as Parameters<typeof instance.signAndSubmit>[0],
        );
        if (!result.success) throw toSembolError(result.error);
        signals.emit("tx:submitted");
      } finally {
        off();
      }
    },
    [requireKit, signals, watchCeremony],
  );

  const addPasskey = useCallback(
    async (options?: AddSignerOptions) => {
      const instance = requireKit();
      setError(null);
      setStatus("registering");
      try {
        const rule = await resolveRule(options?.ruleId);
        const { credentialId, publicKey, transaction } = await instance.signers.addPasskey(
          rule.id,
          config.appName,
          options?.nickname ?? `${config.appName} signer`,
          { nickname: options?.nickname },
        );
        await submit(Promise.resolve(transaction));
        if (options?.nickname && instance.contractId) {
          // Key the nickname by the kit's canonical signer key so the list
          // (which joins by getSignerKey) picks it up.
          const signer = createWebAuthnSigner(
            config.webauthnVerifierAddress,
            publicKey,
            credentialId,
          );
          saveSignerNickname(instance.contractId, getSignerKey(signer), options.nickname);
        }
        if (mounted.current) setStatus("success");
        return { credentialId };
      } catch (err) {
        throw fail(err);
      }
    },
    [requireKit, resolveRule, submit, config.appName, fail],
  );

  const addEd25519 = useCallback(
    async (publicKey: string, options?: AddSignerOptions) => {
      const instance = requireKit();
      setError(null);
      setStatus("signing");
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
        const rule = await resolveRule(options?.ruleId);
        const signer = createEd25519Signer(
          config.ed25519VerifierAddress,
          StrKey.decodeEd25519PublicKey(trimmed),
        );
        await submit(
          instance.signers.addBatch(rule.id, [signer], {
            existingSignerCount: rule.signers.length,
          }),
        );
        if (options?.nickname && instance.contractId) {
          saveSignerNickname(instance.contractId, getSignerKey(signer), options.nickname);
        }
        if (mounted.current) setStatus("success");
      } catch (err) {
        throw fail(err);
      }
    },
    [requireKit, resolveRule, submit, config.ed25519VerifierAddress, fail],
  );

  const addWallet = useCallback(
    async (address: string, options?: AddSignerOptions) => {
      const instance = requireKit();
      setError(null);
      setStatus("signing");
      try {
        const trimmed = address.trim();
        if (!StrKey.isValidEd25519PublicKey(trimmed)) {
          throw new SembolError("invalid_input", `"${address}" is not a valid Stellar account (G…)`);
        }
        const rule = await resolveRule(options?.ruleId);
        await submit(instance.signers.addDelegated(rule.id, trimmed));
        if (options?.nickname && instance.contractId) {
          saveSignerNickname(
            instance.contractId,
            getSignerKey(createDelegatedSigner(trimmed)),
            options.nickname,
          );
        }
        if (mounted.current) setStatus("success");
      } catch (err) {
        throw fail(err);
      }
    },
    [requireKit, resolveRule, submit, fail],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { addPasskey, addEd25519, addWallet, status, error, reset };
}
