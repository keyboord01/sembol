import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Asset } from "@stellar/stellar-sdk";
import { SmartAccountKit, type TransactionResult } from "smart-account-kit";
import { PasskeyWalletContext } from "../context";
import { SembolError, toSembolError } from "../errors";
import { explorerBaseUrl, networkFromPassphrase } from "../format";
import type {
  ConnectOptions,
  CreateWalletOptions,
  PasskeyWalletContextValue,
  ResolvedSembolConfig,
  SembolConfig,
  WalletStatus,
} from "../types";
import { detectWebAuthnCapabilities, type WebAuthnCapabilities } from "../webauthn";

export interface PasskeyWalletProviderProps {
  config: SembolConfig;
  /**
   * Inject a pre-built SmartAccountKit instance (tests, advanced setups).
   * When provided, `config` network fields are still used for display helpers.
   */
  kit?: SmartAccountKit;
  children: ReactNode;
}

function resolveConfig(config: SembolConfig): ResolvedSembolConfig {
  const network = networkFromPassphrase(config.networkPassphrase);
  return {
    ...config,
    appName: config.appName ?? "Stellar App",
    nativeTokenContract:
      config.nativeTokenContract ?? Asset.native().contractId(config.networkPassphrase),
    network,
    explorerBaseUrl: explorerBaseUrl(config.networkPassphrase),
  };
}

/**
 * Provides a configured smart-account-kit instance and wallet connection
 * state to every Sembol hook and component beneath it.
 *
 * SSR-safe: the kit is only constructed after mount, so this can wrap a
 * Next.js App Router tree directly.
 */
export function PasskeyWalletProvider({ config, kit: injectedKit, children }: PasskeyWalletProviderProps) {
  const resolved = useMemo(
    () => resolveConfig(config),
    // Individual fields, so inline config objects don't re-init every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      config.rpcUrl,
      config.networkPassphrase,
      config.accountWasmHash,
      config.webauthnVerifierAddress,
      config.nativeTokenContract,
      config.appName,
      config.rpId,
      config.relayerUrl,
      config.indexerUrl,
    ],
  );

  const [kit, setKit] = useState<SmartAccountKit | null>(null);
  const [status, setStatus] = useState<WalletStatus>("initializing");
  const [address, setAddress] = useState<string | null>(null);
  const [credentialId, setCredentialId] = useState<string | null>(null);
  const [error, setError] = useState<SembolError | null>(null);
  const [capabilities, setCapabilities] = useState<WebAuthnCapabilities | null>(null);
  const [txEpoch, setTxEpoch] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const instance =
      injectedKit ??
      new SmartAccountKit({
        rpcUrl: resolved.rpcUrl,
        networkPassphrase: resolved.networkPassphrase,
        accountWasmHash: resolved.accountWasmHash,
        webauthnVerifierAddress: resolved.webauthnVerifierAddress,
        rpId: resolved.rpId,
        rpName: resolved.appName,
        relayerUrl: resolved.relayerUrl,
        indexerUrl: resolved.indexerUrl,
        storage: resolved.storage,
        sessionExpiryMs: resolved.sessionExpiryMs,
        timeoutInSeconds: resolved.timeoutInSeconds,
        signatureExpirationLedgers: resolved.signatureExpirationLedgers,
        defaultPolicies: resolved.defaultPolicies,
        webAuthn: resolved.webAuthn,
      });

    setKit(instance);

    const offConnected = instance.events.on("walletConnected", ({ contractId, credentialId }) => {
      if (cancelled) return;
      setAddress(contractId);
      setCredentialId(credentialId);
      setStatus("connected");
      setError(null);
    });
    const offDisconnected = instance.events.on("walletDisconnected", () => {
      if (cancelled) return;
      setAddress(null);
      setCredentialId(null);
      setStatus("disconnected");
    });
    const offSubmitted = instance.events.on("transactionSubmitted", () => {
      if (cancelled) return;
      setTxEpoch((epoch) => epoch + 1);
    });

    detectWebAuthnCapabilities().then((caps) => {
      if (!cancelled) setCapabilities(caps);
    });

    if (instance.isConnected && instance.contractId && instance.credentialId) {
      // An injected kit may already be connected.
      setAddress(instance.contractId);
      setCredentialId(instance.credentialId);
      setStatus("connected");
    } else if (resolved.autoConnect !== false) {
      // Silent session restore — never prompts.
      instance
        .connectWallet()
        .then((result) => {
          if (cancelled) return;
          if (!result) {
            setStatus((s) => (s === "initializing" ? "disconnected" : s));
          } else {
            setAddress(result.contractId);
            setCredentialId(result.credentialId);
            setStatus("connected");
          }
        })
        .catch(() => {
          if (!cancelled) setStatus("disconnected");
        });
    } else {
      setStatus("disconnected");
    }

    return () => {
      cancelled = true;
      offConnected();
      offDisconnected();
      offSubmitted();
    };
  }, [resolved, injectedKit]);

  const connect = useCallback(
    async (options?: ConnectOptions) => {
      if (!kit) throw new SembolError("unknown", "Wallet is still initializing — try again in a moment");
      setError(null);
      setStatus("connecting");
      try {
        const result = await kit.connectWallet({
          credentialId: options?.credentialId,
          contractId: options?.contractId,
          fresh: options?.fresh,
          prompt: true,
        });
        if (!result) {
          setStatus(kit.isConnected ? "connected" : "disconnected");
          return null;
        }
        setAddress(result.contractId);
        setCredentialId(result.credentialId);
        setStatus("connected");
        return { contractId: result.contractId, credentialId: result.credentialId };
      } catch (err) {
        const sembolError = toSembolError(err);
        setError(sembolError);
        setStatus(kit.isConnected ? "connected" : "disconnected");
        throw sembolError;
      }
    },
    [kit],
  );

  const createWallet = useCallback(
    async (options?: CreateWalletOptions) => {
      if (!kit) throw new SembolError("unknown", "Wallet is still initializing — try again in a moment");
      setError(null);
      setStatus("creating");
      try {
        const fund = (options?.fund ?? true) && resolved.network === "testnet";
        const result = await kit.createWallet(
          resolved.appName,
          options?.userName ?? `${resolved.appName} user`,
          {
            nickname: options?.nickname,
            authenticatorSelection: options?.authenticatorSelection ?? {
              residentKey: "preferred",
              userVerification: "preferred",
            },
            autoSubmit: true,
            autoFund: fund,
            nativeTokenContract: resolved.nativeTokenContract,
          },
        );
        if (result.submitResult && !result.submitResult.success) {
          throw new SembolError(
            "submission_failed",
            result.submitResult.error ?? "Wallet deployment transaction failed",
          );
        }
        setAddress(result.contractId);
        setCredentialId(result.credentialId);
        setStatus("connected");
        return { contractId: result.contractId, credentialId: result.credentialId };
      } catch (err) {
        const sembolError = toSembolError(err);
        setError(sembolError);
        setStatus(kit.isConnected ? "connected" : "disconnected");
        throw sembolError;
      }
    },
    [kit, resolved],
  );

  const disconnect = useCallback(async () => {
    if (!kit) return;
    try {
      await kit.disconnect();
    } catch (err) {
      setError(toSembolError(err));
    }
    setAddress(null);
    setCredentialId(null);
    setStatus("disconnected");
  }, [kit]);

  const fund = useCallback(async (): Promise<TransactionResult & { amount?: number }> => {
    if (!kit) throw new SembolError("unknown", "Wallet is still initializing — try again in a moment");
    if (!kit.isConnected) throw new SembolError("wallet_not_connected");
    if (resolved.network !== "testnet") {
      throw new SembolError("invalid_input", "Friendbot funding only works on testnet");
    }
    try {
      return await kit.fundWallet(resolved.nativeTokenContract);
    } catch (err) {
      throw toSembolError(err);
    }
  }, [kit, resolved]);

  const value = useMemo<PasskeyWalletContextValue>(
    () => ({
      kit,
      status,
      address,
      credentialId,
      isConnected: status === "connected",
      error,
      capabilities,
      config: resolved,
      txEpoch,
      connect,
      createWallet,
      disconnect,
      fund,
    }),
    [kit, status, address, credentialId, error, capabilities, resolved, txEpoch, connect, createWallet, disconnect, fund],
  );

  return <PasskeyWalletContext.Provider value={value}>{children}</PasskeyWalletContext.Provider>;
}
