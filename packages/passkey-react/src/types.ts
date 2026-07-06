import type {
  PolicyConfig,
  SmartAccountConfig,
  SmartAccountKit,
  StorageAdapter,
  TransactionResult,
} from "smart-account-kit";
import type { SembolError } from "./errors";
import type { WebAuthnCapabilities } from "./webauthn";

/**
 * Configuration for {@link PasskeyWalletProvider}.
 *
 * The four required fields mirror smart-account-kit's `SmartAccountConfig`;
 * everything else is optional and has sensible defaults.
 */
export interface SembolConfig {
  /** Stellar RPC URL, e.g. `https://soroban-testnet.stellar.org`. */
  rpcUrl: string;
  /** Network passphrase, e.g. `Test SDF Network ; September 2015`. */
  networkPassphrase: string;
  /** WASM hash of the OpenZeppelin smart-account contract uploaded on this network. */
  accountWasmHash: string;
  /** Deployed WebAuthn (secp256r1) verifier contract address. */
  webauthnVerifierAddress: string;
  /**
   * Native XLM Stellar Asset Contract address. Enables the default token for
   * `useWalletBalance`, `<WalletBalance />` and testnet funding via `fund()`.
   * Defaults to the SAC derived from the network passphrase.
   */
  nativeTokenContract?: string;
  /** Application name shown in the passkey prompt (WebAuthn rpName). */
  appName?: string;
  /** WebAuthn Relying Party ID. Defaults to the current domain. */
  rpId?: string;
  /**
   * Optional OpenZeppelin Relayer proxy URL for fee-sponsored submission.
   * When omitted, transactions are submitted directly via RPC with the
   * kit's deterministic deployer keypair as fee payer (fine on testnet).
   */
  relayerUrl?: string;
  /** Indexer URL for contract discovery. `false` disables. Defaults to the public testnet indexer. */
  indexerUrl?: string | false;
  /** Credential/session storage adapter. Defaults to IndexedDB. */
  storage?: StorageAdapter;
  /** Session expiry in milliseconds (default 7 days). */
  sessionExpiryMs?: number;
  /** Transaction timeout in seconds (default 30). */
  timeoutInSeconds?: number;
  /** Signature expiration in ledgers (default 720 ≈ 1 hour). */
  signatureExpirationLedgers?: number;
  /** Policy contracts installed on wallet creation. */
  defaultPolicies?: PolicyConfig[];
  /** Custom WebAuthn implementation (used by tests and virtual authenticators). */
  webAuthn?: SmartAccountConfig["webAuthn"];
  /**
   * Silently restore the previous session on mount (no passkey prompt).
   * @default true
   */
  autoConnect?: boolean;
}

/** Connection lifecycle of the provider. */
export type WalletStatus =
  | "initializing"
  | "disconnected"
  | "connecting"
  | "creating"
  | "connected";

/** Options accepted by `connect()`. */
export interface ConnectOptions {
  /** Connect with a specific credential ID (skips the prompt). */
  credentialId?: string;
  /** Connect to a specific contract ID. */
  contractId?: string;
  /** Ignore any stored session and always prompt. */
  fresh?: boolean;
}

/** Options accepted by `createWallet()`. */
export interface CreateWalletOptions {
  /** User identifier shown in the passkey prompt. */
  userName?: string;
  /** Friendly nickname stored with the credential. */
  nickname?: string;
  /**
   * Fund the wallet with testnet XLM via Friendbot after deployment.
   * Only works on testnet. @default true on testnet
   */
  fund?: boolean;
  authenticatorSelection?: {
    authenticatorAttachment?: "platform" | "cross-platform";
    residentKey?: "discouraged" | "preferred" | "required";
    userVerification?: "discouraged" | "preferred" | "required";
  };
}

/** A token reference accepted by balance and transfer APIs. */
export type TokenRef =
  | "native"
  | { code: string; issuer: string }
  | { contractId: string };

/**
 * Internal progress signals emitted by the provider and hooks.
 * smart-account-kit@0.2.x declares transaction events in its type map but
 * never emits them at runtime, so Sembol instruments the WebAuthn ceremony
 * and its own submission paths instead.
 */
export type SembolSignal = "webauthn:start" | "webauthn:done" | "funding:start" | "tx:submitted";

/** Subscribe/emit interface for {@link SembolSignal}s. */
export interface SembolSignalBus {
  on(listener: (signal: SembolSignal) => void): () => void;
  emit(signal: SembolSignal): void;
}

/** Value shared through the Sembol context. */
export interface PasskeyWalletContextValue {
  /** The underlying smart-account-kit instance (null until client mount). */
  kit: SmartAccountKit | null;
  /** Connection lifecycle status. */
  status: WalletStatus;
  /** Connected smart-account contract address (C…), or null. */
  address: string | null;
  /** Base64URL credential ID of the connected passkey, or null. */
  credentialId: string | null;
  /** True when `status === "connected"`. */
  isConnected: boolean;
  /** Last provider-level error (connect/create/disconnect), if any. */
  error: SembolError | null;
  /** WebAuthn capability detection result (null while detecting). */
  capabilities: WebAuthnCapabilities | null;
  /** Resolved configuration. */
  config: ResolvedSembolConfig;
  /** Monotonic counter bumped after every submitted transaction — used for cache invalidation. */
  txEpoch: number;
  /** Internal progress signal bus (advanced; drives status transitions and balance invalidation). */
  signals: SembolSignalBus;
  /** Connect to an existing wallet. Prompts for a passkey when no session/credential is given. */
  connect: (options?: ConnectOptions) => Promise<{ contractId: string; credentialId: string } | null>;
  /** Create a passkey + deploy a smart account. Resolves when the wallet is live on-chain. */
  createWallet: (
    options?: CreateWalletOptions,
  ) => Promise<{ contractId: string; credentialId: string }>;
  /** Disconnect and clear the stored session. */
  disconnect: () => Promise<void>;
  /** Fund the connected wallet with testnet XLM via Friendbot. */
  fund: () => Promise<TransactionResult & { amount?: number }>;
}

/** SembolConfig with defaults applied. */
export interface ResolvedSembolConfig extends SembolConfig {
  appName: string;
  nativeTokenContract: string;
  network: "testnet" | "public" | "custom";
  /** Base explorer URL (stellar.expert) or null for custom networks. */
  explorerBaseUrl: string | null;
}

export type { TransactionResult };
