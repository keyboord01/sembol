/**
 * Deployed OpenZeppelin smart-account contract sets, per network.
 *
 * These are the Protocol 27 artifacts built from
 * OpenZeppelin/stellar-contracts@1e513890, deployed and provenance-verified by
 * the smart-account-kit team (kit repo: docs/deployments-protocol-27-2026-07-09.md;
 * every contract was fetched back and re-hashed against the local build).
 *
 * Spread a preset into your config and add your app fields:
 *
 * ```ts
 * const config: SembolConfig = {
 *   ...SEMBOL_TESTNET_ARTIFACTS,
 *   appName: "My App",
 * };
 * ```
 */

/** Artifact fields shared by every network preset. */
export interface SembolArtifacts {
  rpcUrl: string;
  networkPassphrase: string;
  accountWasmHash: string;
  webauthnVerifierAddress: string;
  ed25519VerifierAddress: string;
  spendingLimitPolicyAddress: string;
  nativeTokenContract: string;
  /**
   * Fee-sponsoring relayer proxy. Since smart-account-kit 0.5.0 the shared
   * deployer is sign-only: auto-submitted wallet creation REQUIRES a relayer
   * (there is no RPC fallback). The testnet preset therefore points at the
   * public SDF proxy; on mainnet you must supply your own.
   */
  relayerUrl?: string;
}

/** Stellar testnet: RPC, passphrase, and the P27 contract set. */
export const SEMBOL_TESTNET_ARTIFACTS: SembolArtifacts = {
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  accountWasmHash: "1b5f4534a76322da2ad7c745f6900857a6802b0ca79850c35a03561df997785a",
  webauthnVerifierAddress: "CC7EKIHQP3TN4CARQDND6CEOY2UXLWWC2X5GHTD5NLAT7BG5GPZIOM3F",
  ed25519VerifierAddress: "CAAVTMCBXEIBPR64EAASKFXERVPYFZA2JYP5A3BG6PESWEFUJX5IHKN4",
  spendingLimitPolicyAddress: "CABXBYJNZ7IUW4G3D6BND5YCAQF3ASSDMDAOKQQ63UYFSO7WUU2TIP5G",
  // Native XLM Stellar Asset Contract on testnet.
  nativeTokenContract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  // Public fee-sponsoring proxy run by the SDF ecosystem team (same default
  // as the smart-account-kit demo). Override with your own, e.g. an
  // OpenZeppelin Relayer Channels proxy, if you outgrow it.
  relayerUrl: "https://smart-account-relayer-proxy.sdf-ecosystem.workers.dev",
};

/** Stellar mainnet: RPC, passphrase, and the P27 contract set. */
export const SEMBOL_MAINNET_ARTIFACTS: SembolArtifacts = {
  rpcUrl: "https://mainnet.sorobanrpc.com",
  networkPassphrase: "Public Global Stellar Network ; September 2015",
  accountWasmHash: "1b5f4534a76322da2ad7c745f6900857a6802b0ca79850c35a03561df997785a",
  webauthnVerifierAddress: "CB7HENHJ7NF34I5FFXQK7D5I3WWQRGB5O5XO77D3NXMT7LM7LOKRQ5YR",
  ed25519VerifierAddress: "CBOOZV2BK5OETGL4Q4KGEBESPRLJFN7DOFWDT7OZGLD7EQEZUVOWUEMC",
  spendingLimitPolicyAddress: "CBCGTERZ6W2M6SMKVKQDTNKWFQXEPXEQO6ZCEKNZHT3QMA4X7Z2IYUS4",
  // Native XLM Stellar Asset Contract on mainnet.
  nativeTokenContract: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
};
