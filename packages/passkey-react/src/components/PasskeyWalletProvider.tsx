import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Asset } from "@stellar/stellar-sdk";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { IndexedDBStorage, SmartAccountKit, type TransactionResult } from "smart-account-kit";
import { PasskeyWalletContext } from "../context";
import { credentialIdFromError, SembolError, toSembolError } from "../errors";
import { explorerBaseUrl, networkFromPassphrase } from "../format";
import type {
  ConnectOptions,
  CreateWalletOptions,
  PasskeyWalletContextValue,
  ResolvedSembolConfig,
  SembolConfig,
  SembolSignal,
  SembolSignalBus,
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
 *
 * Unlike raw smart-account-kit (which defaults to in-memory storage),
 * sessions persist in IndexedDB by default, so reloads silently reconnect.
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

  // Internal signal bus. smart-account-kit declares transaction events in its
  // type map but never emits them at runtime (verified against 0.2.10), so
  // Sembol drives progress/invalidation from its own instrumentation.
  const listenersRef = useRef(new Set<(signal: SembolSignal) => void>());
  const signals = useMemo<SembolSignalBus>(
    () => ({
      on(listener) {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
      emit(signal) {
        listenersRef.current.forEach((listener) => {
          try {
            listener(signal);
          } catch {
            /* one bad listener must not break the rest */
          }
        });
        if (signal === "tx:submitted") setTxEpoch((epoch) => epoch + 1);
      },
    }),
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    // A new kit means a fresh connection state (config change, StrictMode remount).
    setStatus("initializing");
    setAddress(null);
    setCredentialId(null);
    setError(null);

    const baseWebAuthn = resolved.webAuthn ?? { startRegistration, startAuthentication };
    // Inject preference hints so browsers surface the platform authenticator
    // consistently on both create() and get() prompts.
    const withHints = <T extends { hints?: unknown }>(optionsJSON: T): T =>
      resolved.webAuthnHints && optionsJSON.hints === undefined
        ? { ...optionsJSON, hints: resolved.webAuthnHints }
        : optionsJSON;
    // "done" only on success — a cancelled prompt must not read as progress.
    const instrumentedWebAuthn: NonNullable<SembolConfig["webAuthn"]> = {
      startRegistration: async (options) => {
        signals.emit("webauthn:start");
        try {
          const response = await baseWebAuthn.startRegistration({
            ...options,
            optionsJSON: withHints(options.optionsJSON),
          });
          signals.emit("webauthn:done");
          return response;
        } catch (err) {
          signals.emit("webauthn:fail");
          throw err;
        }
      },
      startAuthentication: async (options) => {
        signals.emit("webauthn:start");
        try {
          const response = await baseWebAuthn.startAuthentication({
            ...options,
            optionsJSON: withHints(options.optionsJSON),
          });
          signals.emit("webauthn:done");
          return response;
        } catch (err) {
          signals.emit("webauthn:fail");
          throw err;
        }
      },
    };

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
        // The kit's own default is MemoryStorage, which loses sessions on
        // reload — default to IndexedDB for real persistence.
        storage:
          resolved.storage ??
          (typeof indexedDB !== "undefined" ? new IndexedDBStorage() : undefined),
        sessionExpiryMs: resolved.sessionExpiryMs,
        timeoutInSeconds: resolved.timeoutInSeconds,
        signatureExpirationLedgers: resolved.signatureExpirationLedgers,
        defaultPolicies: resolved.defaultPolicies,
        webAuthn: instrumentedWebAuthn,
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
    // Bridge for future kit versions that do emit transaction events.
    const offSubmitted = instance.events.on("transactionSubmitted", () => {
      if (cancelled) return;
      signals.emit("tx:submitted");
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
  }, [resolved, injectedKit, signals]);

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

        // The kit only *derives* the contract address from the credential. For
        // passkeys whose wallet was created elsewhere (other device/app config),
        // fall back to the public indexer to discover the contract.
        if (sembolError.code === "wallet_not_found" && kit.indexer) {
          const failedCredentialId = credentialIdFromError(err);
          if (failedCredentialId) {
            try {
              const contracts = await kit.discoverContractsByCredential(failedCredentialId);
              const discovered = contracts?.[0]?.contract_id;
              if (discovered) {
                const recovered = await kit.connectWallet({
                  credentialId: failedCredentialId,
                  contractId: discovered,
                });
                if (recovered) {
                  setAddress(recovered.contractId);
                  setCredentialId(recovered.credentialId);
                  setStatus("connected");
                  return {
                    contractId: recovered.contractId,
                    credentialId: recovered.credentialId,
                  };
                }
              }
            } catch {
              // fall through to the original error
            }
          }
        }

        setError(sembolError);
        setStatus(kit.isConnected ? "connected" : "disconnected");
        throw sembolError;
      }
    },
    [kit],
  );

  const waitForFundsVisible = useCallback(
    async (instance: SmartAccountKit, contractId: string) => {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const balance = await instance.rpc.getAssetBalance(
            contractId,
            Asset.native(),
            resolved.networkPassphrase,
          );
          if (balance.balanceEntry) return;
        } catch {
          /* keep waiting */
        }
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
    },
    [resolved.networkPassphrase],
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
          },
        );
        if (result.submitResult && !result.submitResult.success) {
          throw new SembolError(
            "submission_failed",
            result.submitResult.error ?? "Wallet deployment transaction failed",
          );
        }
        if (fund) {
          // Friendbot funds contract addresses directly — more reliable than
          // the kit's temp-account + transfer dance (autoFund).
          signals.emit("funding:start");
          try {
            await kit.rpc.fundAddress(result.contractId);
            await waitForFundsVisible(kit, result.contractId);
          } catch {
            // Non-fatal: the wallet exists, it's just unfunded.
          }
        }
        signals.emit("tx:submitted");
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
    [kit, resolved, signals, waitForFundsVisible],
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
    if (!kit.isConnected || !kit.contractId) throw new SembolError("wallet_not_connected");
    if (resolved.network !== "testnet") {
      throw new SembolError("invalid_input", "Friendbot funding only works on testnet");
    }
    signals.emit("funding:start");
    try {
      // Friendbot funds contract addresses directly — one call, no temp accounts.
      const response = await kit.rpc.fundAddress(kit.contractId);
      await waitForFundsVisible(kit, kit.contractId);
      signals.emit("tx:submitted");
      return { success: true, hash: response.txHash ?? "", amount: 10000 };
    } catch {
      // Already-funded addresses make Friendbot 400 — fall back to the kit's
      // temp-account transfer, which works repeatedly.
      try {
        const result = await kit.fundWallet(resolved.nativeTokenContract);
        if (!result.success) {
          throw new SembolError("submission_failed", result.error ?? "Funding transaction failed");
        }
        signals.emit("tx:submitted");
        return result;
      } catch (err) {
        throw toSembolError(err);
      }
    }
  }, [kit, resolved, signals, waitForFundsVisible]);

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
      signals,
      connect,
      createWallet,
      disconnect,
      fund,
    }),
    [kit, status, address, credentialId, error, capabilities, resolved, txEpoch, signals, connect, createWallet, disconnect, fund],
  );

  return <PasskeyWalletContext.Provider value={value}>{children}</PasskeyWalletContext.Provider>;
}
