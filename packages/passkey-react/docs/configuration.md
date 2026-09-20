# Configuration

SembolConfig fields, the testnet preset, relayer requirements, and environment overrides.

`SEMBOL_TESTNET_ARTIFACTS` is a complete, working testnet preset: RPC, network passphrase, the deployed contract hashes, and a public fee relayer. Spread it and override any field.

```ts
import { SEMBOL_TESTNET_ARTIFACTS, type SembolConfig } from "@sembol/passkey-react";

const config: SembolConfig = {
  ...SEMBOL_TESTNET_ARTIFACTS,
  appName: "My App",            // shown in the passkey prompt
  relayerUrl: process.env.NEXT_PUBLIC_RELAYER_URL
    ?? SEMBOL_TESTNET_ARTIFACTS.relayerUrl,
};
```

## Fields

| Field | Purpose |
| --- | --- |
| `rpcUrl` | Soroban RPC endpoint |
| `networkPassphrase` | Stellar network. Drives explorer links and network display |
| `accountWasmHash` | Smart account contract wasm hash to deploy |
| `webauthnVerifierAddress` | On-chain secp256r1 verifier used by passkey signatures |
| `ed25519VerifierAddress` | Verifier for Ed25519 backup signers |
| `spendingLimitPolicyAddress` | Policy contract behind the spending limit feature |
| `nativeTokenContract` | XLM SAC address. Derived from the passphrase when omitted |
| `relayerUrl` | Fee relayer endpoint. **Required for wallet creation** since smart-account-kit 0.5.0 |
| `appName` | Name in the passkey prompt. Defaults to "Stellar App" |
| `rpId` | WebAuthn relying party id. Defaults to the current domain |
| `webAuthnHints` | Passkey UI ordering hints, e.g. `["client-device", "hybrid"]` |

## The relayer requirement

Since smart-account-kit 0.5.0, the shared deployer is sign-only: **wallet creation must go through a fee relayer**, there is no RPC fallback. The testnet preset points at the public SDF relayer proxy, so testnet works with zero setup. Mainnet currently requires running your own relayer; Sembol Cloud, a hosted option, is in the works.

## Session persistence

Sessions persist in IndexedDB by default, so a reload silently reconnects. Inject your own `storage` adapter or a prebuilt `kit` instance through the provider for tests and advanced setups.
