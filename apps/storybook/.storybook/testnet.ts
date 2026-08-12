import { SEMBOL_TESTNET_ARTIFACTS, type SembolConfig } from "@sembol/passkey-react";

/**
 * Live Stellar TESTNET configuration.
 *
 * Contract artifacts come from the library's SEMBOL_TESTNET_ARTIFACTS preset:
 * the Protocol 27 set deployed and provenance-verified by the smart-account-kit
 * team, matching the *installed kit version* (smart-account-kit@0.4.x). The
 * preset also carries the Ed25519 verifier and spending-limit policy addresses
 * the account-security stories need. Testnet resets can invalidate the values.
 */
export const TESTNET_CONFIG: SembolConfig = {
  ...SEMBOL_TESTNET_ARTIFACTS,
  appName: "Sembol Storybook",
  webAuthnHints: ["client-device", "hybrid"],
};
