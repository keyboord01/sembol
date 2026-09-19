# Sembol — Passkey smart wallets for Stellar

**Turn Face ID into a self-custodial Stellar wallet.** Sembol is an open-source React library
(`@sembol/passkey-react`) where a passkey *is* the wallet — an audited
[OpenZeppelin Smart Account](https://docs.openzeppelin.com/stellar-contracts/accounts/smart-account)
contract on Stellar, opened with Face ID / Touch ID / Windows Hello. No seed phrases, no
extensions. Alongside it, **Sembol Cloud** sponsors fees so people can create and use wallets
holding zero XLM. **Proven on Stellar mainnet.**

```tsx
import { PasskeyWalletProvider, CreateWalletButton, ConnectWalletButton } from "@sembol/passkey-react";
import "@sembol/passkey-react/styles.css";

<PasskeyWalletProvider config={config} theme={{ accent: "#e11d48", radius: "lg" }}>
  <CreateWalletButton />   {/* passkey → deployed smart account, fee-sponsored */}
  <ConnectWalletButton />  {/* restore/connect; becomes an account chip */}
</PasskeyWalletProvider>
```

## Live

| | Where |
| --- | --- |
| **Site + live wallet** | **https://sembol.xyz** — landing, a real wallet you can create in the browser, theme builder, docs |
| **Docs** | **https://sembol.xyz/docs** — install, hooks, theming, recovery, troubleshooting (also machine-readable at `/llms.txt`) |
| **Theme builder** | **https://sembol.xyz/customize** — restyle the whole kit live, copy the config out |
| **Storybook** | **https://storybook.sembol.xyz** — every component and state, interactive |
| **npm** | **https://www.npmjs.com/package/@sembol/passkey-react** — `npm install @sembol/passkey-react` |
| Source (MIT) | https://github.com/keyboord01/sembol |
| Funder | Stellar Instawards (Stellar Türkiye chapter) |

## Mainnet (September 2026)

Sembol runs on **Stellar mainnet**, on the **audited OpenZeppelin smart-account contracts already
deployed there** — Sembol deploys no contracts of its own. A real passkey wallet, created →
funded → passkey-signed payment, every fee sponsored by Sembol Cloud:

- **Wallet** (smart account): [`CBK7DDIM…S24Q`](https://stellar.expert/explorer/public/contract/CBK7DDIMJIB4H6WNOTIU57QPAD267CHOHE6XLS2C3QWTVWYFDLUJS24Q)
- **Receive** (sponsor → wallet, native SAC): [`a99c2a56…`](https://stellar.expert/explorer/public/tx/a99c2a56c6e197f2c6eed61db112c42c5fa5ec1809d818e76da97db0e1e529d8)
- **Send** (passkey-signed, from the wallet): [`54ab44b9…`](https://stellar.expert/explorer/public/tx/54ab44b9625b86bcc3abdbd856435ebc705eafae59da3bbee826075dd6f5a3a0)

Measured mainnet cost: wallet creation **~0.165 XLM** in fees, a payment **~0.003 XLM**. As a pure
fee sponsor, a small float onboards hundreds of wallets. Reproduce with
`scripts/e2e-mainnet-proof.mjs` against an app started in mainnet mode
(`NEXT_PUBLIC_SEMBOL_NETWORK=mainnet`).

> **Note on funding a smart wallet:** a Sembol wallet is a *contract* (`C…` address). Exchanges
> and classic wallets only send classic payments to `G…` addresses, so you cannot fund a smart
> wallet directly from Binance/BtcTurk. Sembol Cloud (or an on-ramp/anchor) delivers the first
> funds; see `scripts/seed-wallet.mjs`. Bridging that gap cleanly is on the roadmap.

## What's in this repo

| Path | What it is |
| --- | --- |
| [`packages/passkey-react`](packages/passkey-react) | **`@sembol/passkey-react`** — the library: 9 components, ~12 headless hooks (create, connect, send, signers, recovery, spending limits), a **typed `theme` API** (`sembolThemeToCss`, presets), WebAuthn edge-case handling, typed errors. **112 tests.** TypeScript, MIT. |
| [`apps/demo`](apps/demo) | Reference app (Next.js 16 + Tailwind 4) built **only** on the published library: onboarding → dashboard → send → history → security, plus a **theme builder** and multi-page **docs**. Also hosts **Sembol Cloud** (`app/api/relayer` + `lib/sponsor.ts`). |
| [`apps/storybook`](apps/storybook) | Public Storybook: every component with live examples, a browser-compatibility matrix, a theming playground, and presets. |
| [`docs/`](docs) | [`SECURITY.md`](docs/SECURITY.md) (Sembol Cloud model), a [Stellar Wallets Kit integration guide](docs/stellar-wallets-kit-integration.md), and a [migration note](docs/migrating-from-passkey-kit.md). |

## Sembol Cloud — fee sponsorship

Since smart-account-kit 0.5.0, wallet creation **requires** a fee relayer (the shared deployer is
sign-only). Sembol Cloud is that layer, and it is part of this repo:

- **`/api/relayer` is a real fee-sponsorship relayer**, not a proxy. It speaks the kit's protocol
  (`{func, auth[]}` and `{xdr}` fee-bump), builds/simulates/signs or fee-bumps, and pays fees
  from **per-project channel accounts**.
- **Budgets are physical:** each project key's channel accounts hold only their allotted float, so
  the on-chain balance *is* the hard cap, plus a per-request fee ceiling.
- **Concurrency-safe:** [per-channel leases](apps/demo/lib/channel-lease.ts) (Redis in production,
  in-process for single-instance) stop two requests sharing a sequence number — verified by
  `scripts/e2e-sponsor-concurrency.mjs` (10 parallel sponsorships, 0 `tx_bad_seq`).
- **Two modes:** the native serverless sponsor above, or a forward-proxy to a self-hosted
  [OpenZeppelin Relayer](https://docs.openzeppelin.com/relayer) for scale.
- Security model (keys held, blast radius, rotation): [`docs/SECURITY.md`](docs/SECURITY.md). The
  key property — compromising Sembol Cloud entirely cannot touch a user wallet.

## Theming

One typed prop restyles every component; a single `accent` derives the rest per color scheme, and
everything still compiles to `--sembol-*` CSS variables you can override by hand.

```tsx
<PasskeyWalletProvider config={config} theme={{ accent: "#0284c7", radius: "lg", colorScheme: "auto" }}>
```

Presets ship in `sembolThemes` (`seal`, `ocean`, `forest`, `mono`); build one visually at
[sembol.xyz/customize](https://sembol.xyz/customize). Full reference:
[sembol.xyz/docs → Theming](https://sembol.xyz/docs/theming).

## Why

Passkey smart wallets are Stellar's best onboarding primitive, but every team was rebuilding the
same React UI on top of the SDK — registration flows, signing approval screens, cross-device
passkey prompts, error states, the WebAuthn long tail — *and* the fee-sponsorship plumbing needed
to onboard a user who holds no XLM. Sembol packages both once: the UI as a headless-first library,
and the sponsorship as Sembol Cloud, so the ecosystem stops paying that tax.

## Foundations (current as of 2026)

- [`passkey-kit`](https://github.com/kalepail/passkey-kit) is legacy; its successor
  [`smart-account-kit`](https://github.com/stellar/smart-account-kit) moved into the **official
  Stellar org** (Aug 2026), built on audited OpenZeppelin smart-account contracts. **Sembol wraps
  smart-account-kit 0.6.x**, and an upstream fix from this project is merged into it
  ([PR #4](https://github.com/stellar/smart-account-kit/pull/4)).
- **Launchtube is retired.** Fee sponsoring runs through relayers (Sembol Cloud, or the
  OpenZeppelin Relayer). The testnet preset defaults to the public SDF proxy so everything works
  with zero config; on mainnet you supply your own sponsor.
- Migrating from the old stack? See [docs/migrating-from-passkey-kit.md](docs/migrating-from-passkey-kit.md).

## Quickstart (this repo)

```bash
pnpm install
pnpm build          # builds @sembol/passkey-react
pnpm test           # 112 vitest unit + component tests
pnpm storybook      # Storybook on :6006
pnpm demo           # reference app on :3000 (testnet by default)
```

Node ≥ 20, pnpm ≥ 10. The demo and Storybook run against Stellar **testnet** with zero config
(Friendbot funds wallets; deploys are fee-sponsored). To run the demo against **mainnet**, start it
with `NEXT_PUBLIC_SEMBOL_NETWORK=mainnet` and set a funded `MAINNET_SPONSOR_SECRET` (see
`apps/demo/.env.example`).

## Network configuration

The library ships both presets: `SEMBOL_TESTNET_ARTIFACTS` and `SEMBOL_MAINNET_ARTIFACTS` (the
Protocol 27 OpenZeppelin contract set for each network — WASM hash, WebAuthn/Ed25519 verifiers,
spending-limit policy, native SAC). `apps/demo/lib/config.ts` selects between them on
`NEXT_PUBLIC_SEMBOL_NETWORK`. Two gotchas:

1. **Artifacts must match the installed kit version.** The kit repo's `main` tracks *unreleased*
   contract surfaces; take values matching the npm release you install.
2. **Stellar testnet resets periodically.** If testnet wallet creation starts failing after a
   reset, refresh the testnet artifacts. (Mainnet is stable.)

## Proof

**Mainnet** — see the Mainnet section above (wallet + receive + send, fee-sponsored, on audited
contracts).

**Testnet** — verified end-to-end in CI with a virtual passkey authenticator
(`scripts/e2e-testnet.mjs`): create wallet → fund via Friendbot → session restored after full
reload → passkey-approved transfer confirmed on-chain. The full journeys (create, sign, recover,
signers, spending limits) run on every push via `.github/workflows/ci.yml`, plus a cross-browser
render/capability smoke check on Chromium, Firefox, and WebKit.

## License

[MIT](LICENSE) — © 2026 Ahmed Murshed and Sembol contributors.
