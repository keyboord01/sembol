import {
  SEMBOL_TESTNET_ARTIFACTS,
  SEMBOL_MAINNET_ARTIFACTS,
  type SembolConfig,
} from "@sembol/passkey-react";

// Opt-in mainnet mode. Testnet stays the zero-config default.
export const IS_MAINNET = process.env.NEXT_PUBLIC_SEMBOL_NETWORK === "mainnet";
export const NETWORK_LABEL = IS_MAINNET ? "Stellar mainnet" : "Stellar testnet";

const ARTIFACTS = IS_MAINNET ? SEMBOL_MAINNET_ARTIFACTS : SEMBOL_TESTNET_ARTIFACTS;

/**
 * Testnet configuration with working defaults - the app runs with zero env.
 *
 * Contract artifacts come from the library's SEMBOL_TESTNET_ARTIFACTS preset:
 * the Protocol 27 set deployed and provenance-verified by the smart-account-kit
 * team (must match the installed kit version, currently 0.6.x). Testnet resets
 * can invalidate them; env vars override every field for that case.
 */
export const sembolConfig: SembolConfig = {
  ...ARTIFACTS,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? ARTIFACTS.rpcUrl,
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? ARTIFACTS.networkPassphrase,
  accountWasmHash:
    process.env.NEXT_PUBLIC_ACCOUNT_WASM_HASH ?? ARTIFACTS.accountWasmHash,
  webauthnVerifierAddress:
    process.env.NEXT_PUBLIC_WEBAUTHN_VERIFIER_ADDRESS ??
    ARTIFACTS.webauthnVerifierAddress,
  ed25519VerifierAddress:
    process.env.NEXT_PUBLIC_ED25519_VERIFIER_ADDRESS ??
    ARTIFACTS.ed25519VerifierAddress,
  spendingLimitPolicyAddress:
    process.env.NEXT_PUBLIC_SPENDING_LIMIT_POLICY_ADDRESS ??
    ARTIFACTS.spendingLimitPolicyAddress,
  nativeTokenContract:
    process.env.NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT ?? ARTIFACTS.nativeTokenContract,
  // Since kit 0.5.0 wallet creation requires a relayer (shared deployer is
  // sign-only, no RPC fallback) - fall back to the preset's public SDF proxy.
  relayerUrl: process.env.NEXT_PUBLIC_RELAYER_URL || ARTIFACTS.relayerUrl,
  appName: "Sembol Demo",
  // Surface the local platform passkey (Touch ID / Windows Hello) first on
  // every prompt - some browsers otherwise bury it on connect.
  webAuthnHints: ["client-device", "hybrid"],
};
