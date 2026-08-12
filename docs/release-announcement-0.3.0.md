# Release announcement draft: @sembol/passkey-react 0.3.0

Draft for Discord / dev channels; the same text works as a Stellar dev forum post (use the
heading as the title). Before posting: run `node scripts/e2e-security.mjs` against the live
demo, then replace every `TX_HASH_HERE` / `CONTRACT_ID_HERE` placeholder with the fresh hashes
and contract id the script prints. Do not post with placeholders in.

---

## @sembol/passkey-react 0.3.0 - recovery, multi-signer, and on-chain spending limits

Losing your phone no longer means losing your wallet.

0.3.0 is the account-security release of `@sembol/passkey-react`, the React library for
Stellar passkey smart wallets (audited OpenZeppelin smart accounts, driven by
smart-account-kit 0.4.2 on the Protocol 27 contracts). Wallets can now have N credentials
where any one is enough to act (a backup passkey on your phone, an offline Ed25519 key, or an
external wallet as co-signer), a guided recovery flow that gets users back in on a brand-new
browser, and a spending limit the chain itself enforces.

What's in the box:

- 4 new components: `<SignerList />`, `<AddSignerButton />`, `<RecoverySetup />`,
  `<SpendingPolicyForm />` - drop them on a page and you have a security tab.
- 5 new headless hooks behind them: `useSigners`, `useAddSigner`, `useRemoveSigner`,
  `useRecovery`, `useSpendingPolicy` - bring your own UI.
- Network presets: `SEMBOL_TESTNET_ARTIFACTS` / `SEMBOL_MAINNET_ARTIFACTS` ship the whole
  deployed contract set, so a working config is one spread plus an app name.
- Precise on-chain error decoding: an over-limit payment reads as
  `spending_limit_exceeded` with a user-ready message, not as a generic failure. New codes:
  `last_signer`, `spending_limit_exceeded`, `policy_not_found`, `recovery_needs_address`.
- Guardrails where it matters: the last signer can never be removed (no self-lockout), and
  recovery enrollment shows users the wallet address they should save.

Get started:

```bash
npm install @sembol/passkey-react
```

```tsx
import { PasskeyWalletProvider, SEMBOL_TESTNET_ARTIFACTS } from "@sembol/passkey-react";
import "@sembol/passkey-react/styles.css";

const config = { ...SEMBOL_TESTNET_ARTIFACTS, appName: "My App" };
```

One honest scope note: spending limits enforce on transfers built as direct token invocations
(which is how this library sends payments); smart-account-kit 0.4.2's own `kit.transfer()`
wraps transfers in `execute` and is not covered until the kit's next release.

Proof it works, on live testnet (from the repo's 9-step E2E: add/remove signer, recovery
including a full storage-wipe reconnect, and an enforced limit):

- Wallet contract (with the spending-limit rule installed):
  https://stellar.expert/explorer/testnet/contract/CONTRACT_ID_HERE
- 2 XLM payment inside a 5 XLM/day limit, confirmed and metered:
  https://stellar.expert/explorer/testnet/tx/TX_HASH_HERE
- 4 XLM payment over the remaining allowance: rejected by the policy contract with
  `ContractError #3221` (`spending_limit_exceeded`) - rejected transactions never land
  on-chain, so the evidence is the enforced rule on the wallet contract above plus the E2E
  run log (`scripts/e2e-security.mjs`).

Heads-up if you were on 0.2.x testnet: 0.3.0 moves to the Protocol 27 contracts, and wallets
created on the 0.2.x-era artifacts are not carried over - create a fresh testnet wallet.

Links:

- npm: https://www.npmjs.com/package/@sembol/passkey-react
- Source (MIT): https://github.com/keyboord01/sembol
- Live demo (testnet): https://sembol-demo.vercel.app - the security tab is
  https://sembol-demo.vercel.app/security
- Storybook (every component, live testnet stories): https://sembol-storybook.vercel.app
- Changelog: https://github.com/keyboord01/sembol/blob/main/packages/passkey-react/CHANGELOG.md

Feedback, bugs, and "I wish the hook did X" issues are very welcome on the repo.
