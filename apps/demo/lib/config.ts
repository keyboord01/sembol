import type { SembolConfig } from "@sembol/passkey-react";

/**
 * Testnet configuration with working defaults — the app runs with zero env.
 * Values track smart-account-kit's current testnet deployment; testnet resets
 * can invalidate the WASM hash (update from kalepail/smart-account-kit).
 */
export const sembolConfig: SembolConfig = {
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org",
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015",
  accountWasmHash:
    process.env.NEXT_PUBLIC_ACCOUNT_WASM_HASH ??
    "8537b8166c0078440a5324c12f6db48d6340d157c306a54c5ea81405abcc2611",
  webauthnVerifierAddress:
    process.env.NEXT_PUBLIC_WEBAUTHN_VERIFIER_ADDRESS ??
    "CCMR63YE5T7MPWREF3PC5XNTTGXFSB4GYUGUIT5POHP2UGCS65TBIUUU",
  nativeTokenContract:
    process.env.NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT ??
    "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  relayerUrl: process.env.NEXT_PUBLIC_RELAYER_URL || undefined,
  appName: "Sembol Demo",
};
