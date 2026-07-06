# Sembol — Passkey Wallet React Component Library for Stellar

**Ship a Stellar passkey smart-wallet flow — create wallet, sign transactions, view balances —
in under an hour.** No seed phrases, no extensions: users authenticate with Face ID / Touch ID /
Windows Hello, and every wallet is an audited
[OpenZeppelin Smart Account](https://docs.openzeppelin.com/stellar-contracts/accounts/smart-account)
contract on Stellar.

```tsx
import { PasskeyWalletProvider, CreateWalletButton, WalletBalance } from "@sembol/passkey-react";
import "@sembol/passkey-react/styles.css";

<PasskeyWalletProvider config={config}>
  <CreateWalletButton />   {/* passkey → deployed smart account → funded (testnet) */}
  <WalletBalance />        {/* live XLM balance, auto-refreshes after every tx */}
</PasskeyWalletProvider>
```

## Links & status

| Deliverable | Where | Status |
| --- | --- | --- |
| Source (private) | https://github.com/keyboord01/sembol | ✅ Live |
| npm package `@sembol/passkey-react` | `packages/passkey-react` | 📦 Publish-ready — `cd packages/passkey-react && npm publish --access public` (needs `npm login`) |
| Storybook site | `apps/storybook` (`pnpm storybook:build` → `storybook-static/`) | 🚀 Deploy-ready — `vercel deploy storybook-static --prod` (needs `vercel login`) |
| Reference app | `apps/demo` | 🚀 Deploy-ready — `vercel deploy --prod` from `apps/demo` (needs `vercel login`) |
| CI | `.github/workflows/ci.yml` | ✅ Build + typecheck + 64 tests on every push |

**Verified end-to-end on live testnet** (automated browser with a virtual passkey authenticator,
`scripts/e2e-testnet.mjs`): created wallet
[`CCGLSSAK…VUSP`](https://stellar.expert/explorer/testnet/contract/CCGLSSAK3W437BF2VTOMFO2YWIS2ZHJNEDKXFOU5V63MZYWF34JAVUSP)
→ funded 10,000 XLM via Friendbot → session restored after full reload → passkey-approved
1 XLM transfer confirmed on-chain:
[`1e009574…1f87`](https://stellar.expert/explorer/testnet/tx/1e00957496a9a076dc975a21b1e7d2a9041c578383388a024da0642de0d41f87)
(status `SUCCESS`, ledger 3460520).

## What's in this repo

| Path | What it is |
| --- | --- |
| [`packages/passkey-react`](packages/passkey-react) | **`@sembol/passkey-react`** — the component library + headless hooks (TypeScript, MIT). 5 components, 7 hooks, WebAuthn edge-case handling, typed errors, CSS-variable theming, 64 unit/smoke tests. |
| [`apps/storybook`](apps/storybook) | Public Storybook: every component/hook documented with **live Stellar-testnet examples**, a browser-compatibility matrix, theming guide, and a full wallet playground. |
| [`apps/demo`](apps/demo) | Reference app (Next.js 16 + Tailwind 4) built **only** with the published library: onboarding → dashboard → send payment → history, on Stellar testnet. |
| [`docs/`](docs) | Integration guide for [Stellar Wallets Kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit) adopters and a migration note for teams on passkey-kit/Launchtube. |

## Why

Passkey smart wallets are Stellar's best onboarding primitive, but every team was rebuilding
the same React UI on top of the SDK: registration flows, signing approval screens, cross-device
passkey prompts, error states, and the long tail of WebAuthn quirks across browsers and OSes.
Sembol packages all of that once, headless-first, so the ecosystem stops paying that tax
(the gap called out by the SCF Passkey UI/SDK RFP).

## Up-to-date foundations (July 2026)

This library was built against the **current** Stellar passkey stack, which moved significantly
in early 2026:

- [`passkey-kit`](https://github.com/kalepail/passkey-kit) is now **legacy**; its successor is
  [`smart-account-kit`](https://github.com/kalepail/smart-account-kit), built on audited
  OpenZeppelin smart-account contracts. **Sembol wraps smart-account-kit.**
- **Launchtube is dead** (domains no longer resolve). Fee sponsoring now runs through the
  [OpenZeppelin Relayer Channels service](https://docs.openzeppelin.com/relayer) —
  testnet API keys are self-serve (`curl https://channels.openzeppelin.com/testnet/gen`).
  The library treats the relayer as optional; on testnet everything works via plain RPC.
- Migrating from the old stack? See [docs/migrating-from-passkey-kit.md](docs/migrating-from-passkey-kit.md).

## Quickstart (this repo)

```bash
pnpm install
pnpm build          # builds @sembol/passkey-react
pnpm test           # 64 vitest unit + component smoke tests
pnpm storybook      # Storybook on :6006 (live testnet stories)
pnpm demo           # reference app on :3000
```

Requires Node ≥ 20 and pnpm ≥ 10. The demo and Storybook run against Stellar **testnet** with
zero configuration (Friendbot funds wallets; fees paid via the kit's deployer account).

## Deliverables map (Instaward SOW)

| Deliverable | Where |
| --- | --- |
| **1 · Component library + hooks** | `packages/passkey-react` — `PasskeyWalletProvider`, `CreateWalletButton`, `ConnectWalletButton`, `SignTransactionModal`, `WalletBalance`; hooks `usePasskeyWallet`, `useCreateWallet`, `useConnectWallet`, `useSignTransaction`, `useTransfer`, `useWalletBalance`, `useWalletAddress`; WebAuthn capability detection + normalized error taxonomy; CSS-variable theming (Tailwind-v4-friendly); passing test suite (`pnpm test`). |
| **2 · Public Storybook with live testnet flows** | `apps/storybook` — one story per component with code snippets, auto prop tables, and a11y notes (`addon-a11y` runs on every story); *Browser Compatibility* page with the full matrix + known limitations; *Live Playground* completes a real create → fund → sign → submit flow in the browser. |
| **3 · Reference app + developer docs** | `apps/demo` (uses only the library) — onboarding, dashboard with faucet, send-payment with approval modal, transaction history with stellar.expert links; docs: package README (install/quickstart/API), [wallets-kit integration guide](docs/stellar-wallets-kit-integration.md), [migration note](docs/migrating-from-passkey-kit.md). |

Out of scope, as agreed: new Soroban contracts, mainnet deployment, native mobile SDKs,
multi-signer/recovery UX (the kit exposes the primitives; UI is phase 2), non-React ports,
and the actual stellar-wallet-kit PR (the integration guide opens that conversation).

## Publishing

The package is publish-ready (`pnpm --filter @sembol/passkey-react build` produces `dist/` with
ESM + type declarations + CSS):

```bash
cd packages/passkey-react
npm publish --access public   # requires npm login for the @sembol scope
```

## Deploying the sites

Both apps are static-friendly Vercel targets:

```bash
# Storybook
cd apps/storybook && pnpm build && vercel deploy storybook-static --prod
# Demo
cd apps/demo && vercel deploy --prod
```

(Optional fee sponsoring for the demo: set `NEXT_PUBLIC_RELAYER_URL=/api/relayer`,
`RELAYER_UPSTREAM_URL=https://channels.openzeppelin.com/testnet/`, and `RELAYER_API_KEY`
from the self-serve `/gen` endpoint.)

## Testnet configuration

The default config uses the smart-account-kit **v0.2.x** testnet artifacts
(WASM hash `a12e8fa9…`, WebAuthn verifier `CBSHV66W…`) — verified live on-chain, end to end.

Two gotchas worth knowing:

1. **Artifacts must match the installed kit version.** The smart-account-kit repo's `main`
   branch tracks *unreleased* contract surfaces — its current env values deploy wallets that
   the published npm kit cannot sign for (`__check_auth` calls `get_context_rules`, which the
   newer wasm renamed/moved). Take values from the repo state matching the npm release.
2. **Stellar testnet resets quarterly.** If wallet creation starts failing after a reset,
   the artifacts need re-uploading or refreshed values.

## License

[MIT](LICENSE) — © 2026 Ahmed Murshed and Sembol contributors.
