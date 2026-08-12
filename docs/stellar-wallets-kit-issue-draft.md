# GitHub issue draft: passkey smart-account module for Stellar Wallets Kit

Text to open as an issue on [Creit-Tech/stellar-wallets-kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit).
Suggested title: **Proposal: passkey smart-account module (WebAuthn wallets, no extension
required)**. Everything below the line is the issue body.

---

## Summary

We would like to propose (and are offering to build) a module that adds passkey-backed
Soroban smart accounts as a wallet option in Stellar Wallets Kit, alongside the existing
extension/hardware/bridge wallets. Filing this first to ask whether that direction is welcome
and how you would want it shaped, before any PR.

## Problem

Stellar Wallets Kit is the de-facto wallet selector for Stellar dapps, and its modules cover
users who already have a wallet (Freighter, xBull, Lobstr, Ledger, WalletConnect, ...). Users
who have no wallet installed hit a dead end: the modal has nothing for them, and "install an
extension first" loses a lot of people, especially on mobile.

Passkey smart wallets close that gap: the user authenticates with Face ID / Touch ID /
Windows Hello, the wallet is an on-chain smart-account contract, and there is nothing to
install. The contract layer for this exists and is audited (OpenZeppelin's smart accounts on
Protocol 27), with [smart-account-kit](https://github.com/kalepail/smart-account-kit) as the
maintained SDK (successor to passkey-kit). But today a dapp that wants both flows has to run
its wallet-kit integration and a separate passkey integration side by side, with two
different "connect" surfaces.

## What we have that could back a module

We maintain [Sembol](https://github.com/keyboord01/sembol) /
[`@sembol/passkey-react`](https://www.npmjs.com/package/@sembol/passkey-react), a library on
top of smart-account-kit. The engine parts that a kit module would need already exist and run
against live testnet:

- Create / connect / silent session restore for passkey smart accounts, plus recovery on a
  fresh device (multi-signer, any-of-N).
- WebAuthn capability detection that answers in a few milliseconds with no network calls
  (relevant for availability checks in a wallet-picker modal), and a normalized error
  taxonomy for the WebAuthn edge cases.
- Signing of Soroban authorization entries with the passkey, including the re-simulation a
  smart account needs before submit (WebAuthn signatures are larger than simulation
  placeholders).
- A live demo (https://sembol-demo.vercel.app) and Storybook
  (https://sembol-storybook.vercel.app) exercising all of it on testnet.

Worth noting: smart-account-kit 0.4.x already integrates with Stellar Wallets Kit in the
*opposite* direction - it ships a `StellarWalletsKitAdapter` (behind an optional peer
dependency on the kit) so wallets from your kit can co-sign on a smart account. A passkey
module would complete that loop: the two ecosystems composing both ways.

## What the module could look like

We have read the v2 module registry from the outside, but you know your module interface and
its invariants far better than we do, so this section is intentionally sketchy - we would
rather follow your guidance than guess. The rough shape as we understand it:

- **Registration**: a module class registered like the built-in ones, listed in the modal as
  something like "Passkey wallet".
- **Availability**: WebAuthn/platform-authenticator detection; fast and offline, so it should
  comfortably fit whatever timing budget the modal has. No polyfills needed in current
  browsers.
- **Address**: the connected wallet is a contract address (`C...`), not a `G...` account.
  The kit looks agnostic about that, but it is a real consideration for consuming dapps
  (anything that assumes sequence numbers or classic operations).
- **Signing**: this is the open design question. Smart accounts do not produce classic
  envelope signatures: they sign Soroban *auth entries*, and the transaction must be
  re-simulated afterwards. So a plain "XDR in, signed XDR out" transaction method cannot be
  implemented honestly. The auth-entry signing path fits naturally, and for whole
  transactions a sign-and-submit style flow (as some bridge-style wallets already use) seems
  like the closest fit. Whether that is acceptable module behavior, or whether you would
  rather grow an explicit smart-wallet capability, is exactly the conversation we are hoping
  to have.
- **Fees**: smart-account submissions need a fee source (a deployer account on testnet, a
  relayer in production). That configuration would stay in the module's constructor and never
  touch the kit's public API.

Dependency-wise the module could depend on smart-account-kit directly (framework-agnostic
core; the React layer is separate and would not be pulled in), and could live in-tree or as a
community package linked from your README - whichever you prefer.

## Offer to contribute

To be explicit: **we are offering to build this module, write its docs and tests, and send
the PR**, and to maintain it afterwards. Everything on our side is MIT. We have a working
technical basis written up in our repo
([integration notes](https://github.com/keyboord01/sembol/blob/main/docs/stellar-wallets-kit-integration.md)),
but we did not want to open a PR shaped by our assumptions about your interface without
asking first.

If a passkey module does not fit the kit's scope, that is a completely fair answer too - a
pointer to what you would prefer instead (community module list, docs entry, or nothing for
now) would still help us and anyone else who lands here searching for passkeys. Thanks for
the kit and for reading.

---

## Companion draft: bug report for kalepail/smart-account-kit

Title: **StellarWalletsKitAdapter imports a nonexistent npm scope
(`@creit-tech` vs `@creit.tech`)**

`smart-account-kit@0.4.2` declares the optional peer dependency
`@creit-tech/stellar-wallets-kit >= 2.1.0` and `wallet-adapter` dynamically
imports the same name:

```js
const { StellarWalletsKit } = await import("@creit-tech/stellar-wallets-kit");
```

The published package is `@creit.tech/stellar-wallets-kit` (dot scope; 2.5.0
at time of writing). The hyphenated scope does not exist on npm, so
`adapter.init()` always fails for anyone installing the real package.

Workaround we are shipping in our docs meanwhile - an npm alias so the import
resolves:

```jsonc
"dependencies": {
  "@creit-tech/stellar-wallets-kit": "npm:@creit.tech/stellar-wallets-kit@^2.5.0"
}
```

Fix is a two-line rename (peerDependencies + the dynamic import). Happy to PR
it if useful.
