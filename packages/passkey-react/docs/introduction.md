# Introduction

Sembol is an open-source React library where Face ID becomes a self-custodial Stellar smart account. No seed phrases, no extensions.

**@sembol/passkey-react** gives your app real Stellar wallets with nothing to install and nothing to write down. A wallet is an [OpenZeppelin smart account](https://github.com/OpenZeppelin/stellar-contracts) contract on Stellar, owned by a passkey in the user's device. Your users tap Face ID; your code calls hooks.

> **Proven, not promised.** This entire site, including [the wallet you can open right now](https://sembol.xyz/wallet), runs on the public npm package. The full passkey journey passes end to end against live Stellar testnet in CI.

## Why Sembol

- **Self-custodial by construction**: the passkey never leaves the device's secure enclave, and the wallet is a contract the user owns on-chain. There is no server copy and no vendor custody.
- **No seed phrases**: passkeys sync through iCloud Keychain and Google Password Manager the way passwords already do.
- **Sponsored onboarding**: wallet creation rides a fee relayer, so users start with zero XLM.
- **Your brand, one prop**: a typed `theme` restyles every component. Try it in the [theme builder](https://sembol.xyz/customize).
- **Recovery is on-chain**: backup signers, recovery credentials, and spending caps are enforced by the contract, not by an API.

## The stack

| Layer | What it is |
| --- | --- |
| Your app | React, any bundler. Next.js and Vite both verified |
| @sembol/passkey-react | Provider, typed hooks, prebuilt themeable components (this library) |
| smart-account-kit | The official low-level Stellar SDK Sembol builds on |
| OpenZeppelin contracts | Audited smart account contracts on Stellar (RC v0.7.0 audit, April 2026) |

## Where to go next

- [Quickstart](https://sembol.xyz/docs/quickstart): a working wallet in one component.
- [Theming](https://sembol.xyz/docs/theming): make it look like your product, not ours.
- [Live Storybook](https://storybook.sembol.xyz): every component, every state, interactive.
