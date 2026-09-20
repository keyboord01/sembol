---
name: sembol-passkey-wallets
description: Add a passkey smart wallet to a Stellar app. Use when a task involves passkeys, WebAuthn, Face ID or Touch ID sign-in on Stellar; smart accounts or account abstraction on Soroban; onboarding users who hold no XLM (gasless or fee-sponsored transactions); or building wallet UI in React/Next.js instead of calling the raw SDK. Covers @sembol/passkey-react components, headless hooks, theming, fee sponsorship, recovery and spending limits.
---

# Sembol — passkey smart wallets for Stellar

A passkey *is* the wallet. Creating one deploys an audited OpenZeppelin Smart Account contract on
Stellar whose only signer is a WebAuthn credential held in the user's device. No seed phrase, no
extension, and fees are sponsored so a new user needs no XLM to start.

Sembol deploys no contracts of its own — it uses the audited OpenZeppelin contracts already on
Stellar mainnet, via the official `smart-account-kit`.

## Choosing the right tool

| Situation | Use |
| --- | --- |
| React or Next.js frontend that needs wallet UI | **`@sembol/passkey-react`** (this skill) |
| Node script, backend, or non-React framework | `smart-account-kit` directly |
| You need a kit API Sembol does not expose | `usePasskeyWallet().kit` — the kit instance is re-exported, so you never have to eject |

## Install and render

```bash
npm install @sembol/passkey-react
```

```tsx
import {
  PasskeyWalletProvider,
  CreateWalletButton,
  ConnectWalletButton,
  SEMBOL_TESTNET_ARTIFACTS,
} from "@sembol/passkey-react";
import "@sembol/passkey-react/styles.css";

<PasskeyWalletProvider config={SEMBOL_TESTNET_ARTIFACTS} theme={{ accent: "#e11d48" }}>
  <CreateWalletButton />
  <ConnectWalletButton />
</PasskeyWalletProvider>
```

The testnet preset needs no configuration and includes a fee relayer. For mainnet use
`SEMBOL_MAINNET_ARTIFACTS` and supply your own relayer URL.

## Task-to-documentation map

Read these rather than guessing an API. They ship inside the package at
`node_modules/@sembol/passkey-react/docs/`, so no network call is needed.

| Task | File |
| --- | --- |
| First integration, install, minimal app | `docs/quickstart.md` |
| Config fields, presets, relayer, env overrides | `docs/configuration.md` |
| Every component and its props | `docs/components.md` |
| Headless hooks (state, create, connect, balance, transfer, sign) | `docs/hooks.md` |
| Restyling, accent derivation, tokens, presets | `docs/theming.md` |
| Backup signers, recovery, spending limits | `docs/security.md` |
| Unstyled components, custom WebAuthn/storage adapters, kit injection | `docs/headless.md` |
| Something is broken | `docs/troubleshooting.md` |

Online equivalents: https://sembol.xyz/llms.txt (index), https://sembol.xyz/llms-full.txt (one file).

## Constraints that cause real bugs

- **Passkeys are bound to their origin.** A wallet created on one domain will not open on another.
  Decide the production domain before sharing the app.
- **Wallet creation requires a fee relayer.** Since `smart-account-kit` 0.5.0 the shared deployer is
  sign-only; there is no relayer-free path. Testnet preset includes one; bring your own on mainnet.
- **A wallet is a contract (`C…`) address.** Exchanges and classic wallets can only send classic
  payments to `G…` accounts, so a user cannot top up a smart wallet straight from an exchange.
  Funding goes through a Soroban SAC transfer or an on-ramp.
- **Restyle with the `theme` prop**, which compiles to `--sembol-*` CSS variables. Do not fork
  components to change colors.
- **Catch `SembolError` and switch on `code`**, never on message text.

## Verifying before you claim it works

A passkey flow cannot be confirmed by a type-check. Run the app (`pnpm demo`), create a wallet in a
real browser, and check the resulting contract on an explorer. `CreateWalletButton` failing silently
almost always means the relayer is unset or unreachable — check `docs/troubleshooting.md`.
