/**
 * @sembol/passkey-react
 *
 * React components and headless hooks for Stellar passkey smart wallets,
 * built on smart-account-kit (OpenZeppelin Smart Accounts).
 *
 * Import the default theme once:
 * ```ts
 * import "@sembol/passkey-react/styles.css";
 * ```
 */

// Provider + components
export {
  PasskeyWalletProvider,
  type PasskeyWalletProviderProps,
} from "./components/PasskeyWalletProvider";
export { ConnectWalletButton, type ConnectWalletButtonProps } from "./components/ConnectWalletButton";
export { CreateWalletButton, type CreateWalletButtonProps } from "./components/CreateWalletButton";
export { WalletBalance, type WalletBalanceProps } from "./components/WalletBalance";
export {
  SignTransactionModal,
  type SignTransactionModalProps,
} from "./components/SignTransactionModal";

// Headless hooks
export { usePasskeyWallet } from "./hooks/usePasskeyWallet";
export { useConnectWallet, type ConnectStatus, type UseConnectWalletResult } from "./hooks/useConnectWallet";
export {
  useCreateWallet,
  type CreateWalletPhase,
  type CreateWalletStatus,
  type UseCreateWalletResult,
} from "./hooks/useCreateWallet";
export {
  useSignTransaction,
  type SignOptions,
  type SignStatus,
  type UseSignTransactionResult,
} from "./hooks/useSignTransaction";
export { useTransfer, type TransferParams, type TransferStatus, type UseTransferResult } from "./hooks/useTransfer";
export { useWalletAddress, type UseWalletAddressResult } from "./hooks/useWalletAddress";
export {
  useWalletBalance,
  type BalanceStatus,
  type UseWalletBalanceOptions,
  type UseWalletBalanceResult,
} from "./hooks/useWalletBalance";

// Errors
export { SembolError, toSembolError, type SembolErrorCode } from "./errors";

// WebAuthn capability detection
export {
  detectWebAuthnCapabilities,
  UNSUPPORTED_CAPABILITIES,
  type WebAuthnCapabilities,
} from "./webauthn";

// Utilities
export {
  explorerBaseUrl,
  explorerUrl,
  formatTokenAmount,
  networkFromPassphrase,
  parseTokenAmount,
  truncateAddress,
  type StellarNetwork,
} from "./format";
export {
  summarizeTransaction,
  type SummarizableTransaction,
  type TransactionSummary,
} from "./summary";
export {
  buildContractCallTransaction,
  buildTransferTransaction,
  type BuildContractCallParams,
  type BuildTransferParams,
} from "./transactions";

// Types
export type {
  ConnectOptions,
  CreateWalletOptions,
  PasskeyWalletContextValue,
  ResolvedSembolConfig,
  SembolConfig,
  SembolSignal,
  SembolSignalBus,
  TokenRef,
  WalletStatus,
} from "./types";

// Re-exports from smart-account-kit that adopters commonly need
export {
  IndexedDBStorage,
  LocalStorageAdapter,
  MemoryStorage,
  SmartAccountKit,
} from "smart-account-kit";
export type {
  AssembledTransaction,
  SmartAccountConfig,
  StorageAdapter,
  TransactionResult,
} from "smart-account-kit";
