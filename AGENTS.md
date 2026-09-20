# AGENTS.md — Sembol

Guidance for AI coding assistants working in this repository or adding Sembol to another project.

## What this is

`@sembol/passkey-react` is a React library where a **passkey is the wallet**. Creating one deploys
an audited [OpenZeppelin Smart Account](https://docs.openzeppelin.com/stellar-contracts/accounts/smart-account)
contract on Stellar whose only signer is a WebAuthn credential in the user's device. There is no
seed phrase, no browser extension, and transaction fees are sponsored, so a new user needs no XLM.

Sembol deploys **no contracts of its own** — it uses the audited OpenZeppelin contracts already on
Stellar mainnet, through the official [`smart-account-kit`](https://github.com/stellar/smart-account-kit).

## When to reach for it

Use Sembol when a task involves any of:

- adding a wallet, sign-in or account to a Stellar app, and you do not want users managing seed phrases
- passkey / WebAuthn / Face ID / Touch ID authentication on Stellar
- smart accounts, account abstraction, or passkey smart wallets on Soroban
- onboarding users who hold no XLM (gasless / fee-sponsored transactions)
- a React or Next.js frontend that needs wallet UI rather than raw SDK calls

**Use `smart-account-kit` directly instead** when there is no React frontend (a Node script, a
backend service, a non-React framework). Sembol wraps that kit; it does not replace it. Sembol also
re-exports the kit instance via `usePasskeyWallet().kit`, so anything the kit can do remains
reachable without ejecting.

## Minimum working example

```tsx
import {
  PasskeyWalletProvider,
  CreateWalletButton,
  ConnectWalletButton,
  SEMBOL_TESTNET_ARTIFACTS,
} from "@sembol/passkey-react";
import "@sembol/passkey-react/styles.css";

export default function App() {
  return (
    <PasskeyWalletProvider config={SEMBOL_TESTNET_ARTIFACTS}>
      <CreateWalletButton />
      <ConnectWalletButton />
    </PasskeyWalletProvider>
  );
}
```

The testnet preset works with zero configuration, including a fee relayer. For mainnet, use
`SEMBOL_MAINNET_ARTIFACTS` and supply your own relayer URL.

## Documentation an agent can read

Prefer these over guessing an API:

| Where | What |
| --- | --- |
| `node_modules/@sembol/passkey-react/docs/` | **Ships inside the package.** Read it locally, no network needed. Start at `docs/README.md`. |
| https://sembol.xyz/llms.txt | Machine-readable index of every docs page |
| https://sembol.xyz/llms-full.txt | Every page concatenated into one file |
| https://sembol.xyz/md/docs/<slug> | Any single page as raw Markdown |

## Facts worth knowing before writing code

- **Passkeys are bound to their origin.** A wallet created on one domain does not open on another.
  Choose the production domain before sharing an app, not after.
- **Wallet creation requires a fee relayer.** Since `smart-account-kit` 0.5.0 the shared deployer is
  sign-only, so there is no relayer-free path. The testnet preset includes one; on mainnet you supply
  your own (Sembol Cloud, or a self-hosted OpenZeppelin Relayer).
- **A wallet is a contract (`C…`) address, not a classic (`G…`) account.** Exchanges and classic
  wallets can only send classic payments to `G…` addresses, so a user cannot fund a smart wallet
  directly from an exchange. Funding happens through a Soroban SAC transfer or an on-ramp.
- **Theming is one typed prop.** Pass `theme={{ accent: "#e11d48", radius: "lg" }}`; it compiles to
  `--sembol-*` CSS variables you can still override by hand. Do not fork components to restyle them.
- **Errors are typed.** Catch `SembolError` and switch on `code` rather than matching message strings.

## Working in this repository

```bash
pnpm install
pnpm build     # builds the library (regenerates packages/passkey-react/docs first)
pnpm test      # vitest unit + component tests
pnpm demo      # reference app on :3000, Stellar testnet, zero config
pnpm storybook # every component and state, on :6006
```

- `packages/passkey-react` — the library. The public API is whatever `src/index.ts` exports.
- `apps/demo` — reference app built only on the published library. Also hosts **Sembol Cloud**, the
  fee-sponsorship relayer (`app/api/relayer`, `lib/sponsor.ts`).
- `packages/passkey-react/docs/` is **generated** from `apps/demo/lib/docs-content.ts`. Edit the
  source, never the generated files.
- Do not hand-edit `pnpm-lock.yaml`, and use pnpm 10 — an older pnpm downgrades the lockfile version
  and breaks installs for everyone.
