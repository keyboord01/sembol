import type { SembolConfig } from "@sembol/passkey-react";

/**
 * Testnet configuration with working defaults - the app runs with zero env.
 *
 * IMPORTANT: the WASM hash + verifier must match the *installed kit version*
 * (smart-account-kit@0.2.x), not the repo's main branch - main tracks
 * unreleased contract surfaces. Testnet resets can also invalidate them.
 */
export const sembolConfig: SembolConfig = {
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org",
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015",
  accountWasmHash:
    process.env.NEXT_PUBLIC_ACCOUNT_WASM_HASH ??
    "a12e8fa9621efd20315753bd4007d974390e31fbcb4a7ddc4dd0a0dec728bf2e",
  webauthnVerifierAddress:
    process.env.NEXT_PUBLIC_WEBAUTHN_VERIFIER_ADDRESS ??
    "CBSHV66WG7UV6FQVUTB67P3DZUEJ2KJ5X6JKQH5MFRAAFNFJUAJVXJYV",
  nativeTokenContract:
    process.env.NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT ??
    "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  relayerUrl: process.env.NEXT_PUBLIC_RELAYER_URL || undefined,
  appName: "Sembol Demo",
  // Surface the local platform passkey (Touch ID / Windows Hello) first on
  // every prompt - some browsers otherwise bury it on connect.
  webAuthnHints: ["client-device", "hybrid"],
};
