# Changelog

## 0.3.1 - 2026-08-12

Upstream hardening release: smart-account-kit `^0.4.2` -> `^0.6.0` (the kit
now lives at [stellar/smart-account-kit](https://github.com/stellar/smart-account-kit)
after its adoption into the official Stellar org). No Sembol API changes; all
102 tests pass unchanged.

### Fixed
- **Wallet creation crashed under Next.js/Turbopack with kit >=0.5.0**
  (`Buffer.from(...).readBigInt64BE is not a function`): the kit's new
  client-side deploy authorization entries use Buffer BigInt accessors that
  Next's bundled `buffer` polyfill (pre-6.x feross/buffer) does not have. The
  library now ships a tiny feature-detected prototype shim (loaded before any
  kit code) that adds the missing BigInt read/write methods, so no bundler
  configuration is needed. Real Node/browser Buffers are untouched.

### Fixed (via upstream)
- **Backup-passkey mapping loss** (kit 0.5.1): the connect/sync path could
  delete the stored row that maps an added (non-derived) passkey to its
  wallet - the exact credential our add-signer flow creates. On 0.4.2 a
  backup passkey could stop resolving its wallet after session expiry.
- **Signer/policy contract errors returned as data** (kit 0.5.2): reads on
  the signer/policy paths could receive an `Err` object where a value was
  expected instead of the documented typed error.
- **Scoped-rule resolution** (kit 0.5.0): automatic context-rule resolution
  now prefers a rule scoped to the invoked contract over a `Default`
  fallback, closing a path that could bypass a spending limit at signing
  time. Sembol already pinned the scoped rule in its own sign path; the
  default path now matches.

### Changed
- **Wallet creation now goes through a fee-sponsoring relayer** (kit 0.5.0
  makes the shared deployer sign-only; auto-submitted deploys no longer fall
  back to RPC). `SEMBOL_TESTNET_ARTIFACTS` therefore ships a `relayerUrl`
  default (the public SDF testnet proxy), so the one-spread config keeps
  working with zero changes. Override or unset it via config/env. On mainnet
  supply your own relayer (e.g. an OpenZeppelin Relayer Channels proxy).
- Connecting from an untrusted source (address derivation or an app-supplied
  address, e.g. recovery-by-address) now verifies the account runs an
  accepted smart-account WASM before proceeding (kit 0.6.0,
  `acceptedWasmHashes`, defaults to the preset's `accountWasmHash`).
- `kit.transfer()`-style transfers are now signed as direct token invocations
  upstream, so spending limits cover them kit-wide - previously guaranteed
  only for transfers built by this library.

## 0.3.0 - 2026-08-02

The account-security release: recovery, multi-signer, and spending limits.

### Added
- Components: `<SignerList />`, `<AddSignerButton />`, `<RecoverySetup />`,
  `<SpendingPolicyForm />`.
- Hooks: `useSigners`, `useAddSigner`, `useRemoveSigner`, `useRecovery`,
  `useSpendingPolicy`.
- `SEMBOL_TESTNET_ARTIFACTS` / `SEMBOL_MAINNET_ARTIFACTS` presets: the full
  Protocol 27 contract set (account WASM, WebAuthn + Ed25519 verifiers,
  spending-limit policy, native SAC) so a config is one spread + an app name.
- Config: `ed25519VerifierAddress`, `spendingLimitPolicyAddress`,
  `indexerAuthToken`, `contextRuleProbe`.
- Error codes: `last_signer`, `spending_limit_exceeded`, `policy_not_found`,
  `recovery_needs_address`; on-chain `ContractError`s now decode to precise
  codes (a rejected over-limit payment reads like one, not like a generic
  failure).

### Changed
- smart-account-kit `^0.2.10` -> `^0.4.2` (Protocol 27 contracts). Wallets
  created on the 0.2.x-era testnet artifacts use the previous contract
  interface and are not carried over - create a fresh testnet wallet.
- Each added signer gets its own single-signer Default rule (any-of-N):
  a policy-less rule requires all of its signers, so a shared rule would
  force every action to collect every signature.
- Spending limits enforce through the core sign path: `signAndSubmit` pins
  the policy-bearing token-scoped rule at signing time. Enforcement covers
  transfers built as direct token invocations (Sembol's send path);
  smart-account-kit 0.4.2's own `kit.transfer()` wraps transfers in
  `execute` and is not covered until the kit's next release.
- `signAndSubmit`/`transfer` results narrow to `TransactionSuccess`
  (failures throw a mapped `SembolError`); `SignTransactionModal.onSuccess`
  receives a confirmed transaction.

## 0.2.2 - 2026-07-06

### Changed
- Ship `CHANGELOG.md` and `LICENSE` in the published tarball; README notes the bundler
  requirement (the underlying smart-account-kit ships bundler-resolved ESM).

## 0.2.1 - 2026-07-06

### Added
- `already_funded` error code: Friendbot's "account already funded to starting balance" 400 is
  now a distinct, friendly (non-recoverable) error instead of a scary `submission_failed`.

## 0.2.0 - 2026-07-06

### Added
- `variant` (`primary` · `secondary` · `outline` · `ghost` · `destructive`) and `size`
  (`sm` · `md` · `lg`) props on `ConnectWalletButton` and `CreateWalletButton`.
- `webAuthnHints` config - WebAuthn L3 hints injected into every passkey prompt so
  browsers surface the platform authenticator consistently on `get()` as well as `create()`.
- Error **toasts**: button failures render in a portal (auto-dismiss + manual close) and can
  no longer stretch or shift the surrounding layout.
- Full design-token overhaul: neutral/accent scales with hover/active/muted steps, tinted
  status colors, elevation + radius + motion scales, refined dark mode,
  `prefers-reduced-motion` support. All 0.1.0 variable names remain valid.

### Fixed
- Balance reads for classic `G…` addresses with the native token (account entries have no
  trustline - now read via simulation).
- `useWalletBalance`: in-flight reads are invalidated when disabled/disconnected;
  `isRefreshing` can no longer stick after identity changes; token switches reset stale data.
- Modal focus management while busy and on completion; menu keyboard support scoped to the
  widget (no more page-wide arrow-key capture), focus restored to the chip on close.
- Cancelled passkey prompts no longer read as submission progress.

## 0.1.0 - 2026-07-06

Initial release: `PasskeyWalletProvider`, `ConnectWalletButton`, `CreateWalletButton`,
`WalletBalance`, `SignTransactionModal`; hooks `usePasskeyWallet`, `useConnectWallet`,
`useCreateWallet`, `useSignTransaction`, `useTransfer`, `useWalletBalance`,
`useWalletAddress`; WebAuthn capability detection; normalized error taxonomy; transaction
builders and summaries; CSS-variable theming; IndexedDB session persistence.
