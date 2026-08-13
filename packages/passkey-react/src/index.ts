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

// Must run before any smart-account-kit code touches XDR in the browser:
// patches bundler `buffer` polyfills that lack the BigInt accessors.
import "./buffer-compat";

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
export { SignerList, type SignerListProps } from "./components/SignerList";
export { AddSignerButton, type AddSignerButtonProps } from "./components/AddSignerButton";
export { RecoverySetup, type RecoverySetupProps } from "./components/RecoverySetup";
export { SpendingPolicyForm, type SpendingPolicyFormProps } from "./components/SpendingPolicyForm";

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
export { useSigners, type UseSignersResult } from "./hooks/useSigners";
export {
  useAddSigner,
  type AddSignerOptions,
  type AddSignerStatus,
  type UseAddSignerResult,
} from "./hooks/useAddSigner";
export {
  useRemoveSigner,
  type RemoveSignerStatus,
  type UseRemoveSignerResult,
} from "./hooks/useRemoveSigner";
export {
  useRecovery,
  type EnrollRecoveryParams,
  type RecoverOutcome,
  type RecoveryStatus,
  type UseRecoveryResult,
} from "./hooks/useRecovery";
export {
  useSpendingPolicy,
  type SetSpendingLimitParams,
  type SpendingPolicyState,
  type SpendingPolicyStatus,
  type UseSpendingPolicyResult,
} from "./hooks/useSpendingPolicy";
export {
  useWalletBalance,
  type BalanceStatus,
  type UseWalletBalanceOptions,
  type UseWalletBalanceResult,
} from "./hooks/useWalletBalance";

// Errors
export { SembolError, toSembolError, contractCodeFromMessage, type SembolErrorCode } from "./errors";

// Deployed contract sets per network (spread into your SembolConfig)
export {
  SEMBOL_TESTNET_ARTIFACTS,
  SEMBOL_MAINNET_ARTIFACTS,
  type SembolArtifacts,
} from "./artifacts";

// Styling primitives
export type { ButtonSize, ButtonVariant } from "./internal/ui";

// Account-security primitives
export type { SignerInfo, SignerKind } from "./internal/security";
export {
  describeLedgerPeriod,
  periodToLedgers,
  type PolicyPeriod,
} from "./internal/policy";

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
  TransactionFailure,
  TransactionResult,
  TransactionSuccess,
} from "smart-account-kit";
