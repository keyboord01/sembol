import type { SembolConfig } from "@sembol/passkey-react";

/**
 * Live Stellar TESTNET configuration.
 *
 * IMPORTANT: the WASM hash + verifier must match the *installed kit version*
 * (smart-account-kit@0.2.x), not the repo's main branch - main tracks
 * unreleased contract surfaces. Values below are the 0.2.x testnet artifacts.
 * Testnet resets can also invalidate them.
 */
export const TESTNET_CONFIG: SembolConfig = {
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  accountWasmHash: "a12e8fa9621efd20315753bd4007d974390e31fbcb4a7ddc4dd0a0dec728bf2e",
  webauthnVerifierAddress: "CBSHV66WG7UV6FQVUTB67P3DZUEJ2KJ5X6JKQH5MFRAAFNFJUAJVXJYV",
  nativeTokenContract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  appName: "Sembol Storybook",
  webAuthnHints: ["client-device", "hybrid"],
};
