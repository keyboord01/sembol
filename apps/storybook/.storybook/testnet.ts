import type { SembolConfig } from "@sembol/passkey-react";

/**
 * Live Stellar TESTNET configuration.
 *
 * Contract values come from smart-account-kit's current testnet deployment
 * (see the kit's demo/.env.example). Testnet resets can invalidate the WASM
 * hash — update from the smart-account-kit repo if wallet creation fails.
 */
export const TESTNET_CONFIG: SembolConfig = {
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  accountWasmHash: "8537b8166c0078440a5324c12f6db48d6340d157c306a54c5ea81405abcc2611",
  webauthnVerifierAddress: "CCMR63YE5T7MPWREF3PC5XNTTGXFSB4GYUGUIT5POHP2UGCS65TBIUUU",
  nativeTokenContract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  appName: "Sembol Storybook",
};
