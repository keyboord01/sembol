# Changelog

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
