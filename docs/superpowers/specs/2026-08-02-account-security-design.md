# Sembol Month 2: Account Security layer — design

Date: 2026-08-02 · Target: `@sembol/passkey-react` 0.3.0 · SOW: Month 2 Deliverable 1
Status: implementing (private workbench `keyboord01/sembol-dev`, branch `month-2`)

## Goal

Add recovery, multi-signer management, and per-signer spending limits to
`@sembol/passkey-react`: four components (`<SignerList/>`, `<AddSignerButton/>`,
`<RecoverySetup/>`, `<SpendingPolicyForm/>`) and five hooks (`useSigners`,
`useAddSigner`, `useRemoveSigner`, `useRecovery`, `useSpendingPolicy`), on
smart-account-kit **0.4.2**.

Every kit API named here was verified against the published 0.4.2 tarball
(`dist/*.d.ts`) and the kit repo demo. Extraction notes live in the session
scratchpad (`extract-{signers,policies,recovery,config}.md`).

## Foundation: upgrade 0.2.10 → 0.4.2

### Artifacts (Protocol 27 set, deployed + provenance-verified by the kit team)

| | Testnet | Mainnet |
|---|---|---|
| Account WASM hash | `1b5f4534a76322da2ad7c745f6900857a6802b0ca79850c35a03561df997785a` | same wasm, uploaded (`c6c7461f…` upload tx) |
| WebAuthn verifier | `CC7EKIHQP3TN4CARQDND6CEOY2UXLWWC2X5GHTD5NLAT7BG5GPZIOM3F` | `CB7HENHJ7NF34I5FFXQK7D5I3WWQRGB5O5XO77D3NXMT7LM7LOKRQ5YR` |
| Ed25519 verifier | `CAAVTMCBXEIBPR64EAASKFXERVPYFZA2JYP5A3BG6PESWEFUJX5IHKN4` | `CBOOZV2BK5OETGL4Q4KGEBESPRLJFN7DOFWDT7OZGLD7EQEZUVOWUEMC` |
| Spending-limit policy | `CABXBYJNZ7IUW4G3D6BND5YCAQF3ASSDMDAOKQQ63UYFSO7WUU2TIP5G` | `CBCGTERZ6W2M6SMKVKQDTNKWFQXEPXEQO6ZCEKNZHT3QMA4X7Z2IYUS4` |

Source: kit repo `docs/deployments-protocol-27-2026-07-09.md` (built from
OpenZeppelin/stellar-contracts@1e513890, fetched back and re-hashed).

The library exports `SEMBOL_TESTNET_ARTIFACTS` / `SEMBOL_MAINNET_ARTIFACTS`
presets so an app config is just `{...SEMBOL_TESTNET_ARTIFACTS, appName}`.
Old 0.2.x-era wallets (wasm `a12e8fa9…`) use a different contract interface and
do not carry over; testnet demo wallets are recreated (documented in CHANGELOG).

### Wrapper-visible 0.4.2 changes (from tarball diff)

- **`TransactionResult` is a discriminated union**; on failure `error` is a
  `SmartAccountError` object (not a string), `hash` optional. Every
  `result.error ?? "…"`-style read in provider/hooks/components changes to
  narrowing on `result.success` and reading `result.error.message`.
- **New config fields** we pass through: `ed25519VerifierAddress?`,
  `contextRuleProbe?`, `indexerAuthToken?`. (`deployerSecret` /
  `externalSignerStorage` / `externalWallet` deferred until the
  stellar-wallets-kit step in D3.)
- **`defaultPolicies` is now honored** (was dead in 0.2.x) — keep exposing it.
- Indexer default is Mercury (public, no token); we keep `indexerUrl` optional
  and never pin the old decommissioned workers.dev URLs.
- Kit still never emits `transactionSubmitted`/`transactionSigned` (verified by
  grep of compiled dist) → **the Sembol signal bus stays**. New
  `events.setErrorHandler` is wired to route listener errors to console in dev.
- Kit still has no WebAuthn `hints` support and no duplicate-credential
  `excludeCredentials` → our hint injection and `InvalidStateError` mapping stay.
- New error classes to map in `toSembolError`: `ContractError`
  (`contractCode`, e.g. 3221 SpendingLimitExceeded), `ValidationError`,
  `PolicyNotFoundError`, `SignerNotFoundError` (already partly mapped by code).

## Domain model

A smart account's authorization is a set of **context rules**:
`{id, context_type: Default | CallContract(addr) | CreateContract(hash), signers[], policies[], valid_until?}`.
Rule 0 (created at deploy) is the Default rule holding the primary passkey.

Sembol's opinionated mapping (advanced users can drop to `kit.rules` directly):

- **"Signers" (SignerList/AddSigner/RemoveSigner)** = signers on the **Default
  rule** (rule the primary passkey lives on). Adding a device/key = adding a
  signer to that rule. This matches `kit.multiSigners.getAvailableSigners()`
  semantics.
- **"Recovery"** = a named additional passkey (or Ed25519 key) on the Default
  rule + the recover-access flow on a fresh browser.
- **"Spending limit"** = a dedicated **`CallContract(tokenSAC)` rule** holding
  the chosen signers with the **spending-limit policy** attached. Never on the
  Default rule (policy errors `OnlyCallContractAllowed` 3227 and would be inert).

## The 0.4.2 enforcement landmine, and why Sembol dodges it

Verified against compiled dist: in published 0.4.2, `kit.transfer` and
`kit.multiSigners.transfer` wrap the token call in the account's `execute`, so a
`CallContract(token)` rule never matches them and the spending-limit policy is
never consulted (fixed only in the kit's unreleased branch). **But Sembol's own
send path (`buildTransferTransaction` → `kit.signAndSubmit`) already builds the
token `transfer` as a direct invocation** — the same shape as the kit's
unreleased `buildDirectTokenTransfer`. So token-scoped rules match and the
policy reads `amount = args[2]` correctly through our flow, today.

Remaining hazard: 0.4.2 rule auto-resolution has no scoped-over-Default
preference — with a policy-bearing scoped rule and the Default rule both
matching, it can silently select Default (bypass) or throw on ambiguity. Fix:
Sembol's sign path passes **`resolveContextRuleIds`** (available on
`sign`/`signAndSubmit` in 0.4.2) via an internal helper that prefers a
policy-bearing `CallContract(invoked contract)` rule containing the active
credential, falling back to default resolution otherwise.

Docs state plainly: enforcement applies to transfers sent through Sembol (or
any direct token invocation); the kit's own `transfer()` doesn't enforce until
its next release.

## Config additions (`SembolConfig`)

```ts
ed25519VerifierAddress?: string;      // enables Ed25519 recovery keys
spendingLimitPolicyAddress?: string;  // deployed policy contract; preset per network
contextRuleProbe?: { enabled?: boolean; maxRuleId?: number; maxConsecutiveMisses?: number };
indexerAuthToken?: string;
```

Presets fill all artifact fields for testnet/mainnet. All new fields optional —
existing 0.2.x configs keep compiling (behavioral break is only the kit-level
artifact change, called out in the migration note).

## Hooks

### `useSigners()`
```ts
{ signers: SignerInfo[]; rules: ContextRule[]; isLoading; error; refresh() }
// SignerInfo: { signer: ContractSigner; ruleId: number; type: "passkey"|"ed25519"|"wallet"|"contract";
//   display: string; nickname?: string; isActive: boolean; isPrimary: boolean }
```
Reads `kit.rules.list()` (indexer-backed with on-chain probe fallback),
flattens signers with `formatSignerForDisplay`, joins nicknames from
`kit.credentials.getForWallet()`/local metadata, marks the connected credential
`isActive`. Refetches on `txEpoch` change (existing invalidation pattern).

### `useAddSigner()`
```ts
{ addPasskey({nickname?}): Promise<{credentialId}>;   // registration ceremony → add_signer tx → signAndSubmit
  addEd25519({publicKey | secret}): Promise<{address}>; // createEd25519Signer + signers.addBatch → signAndSubmit
  addWallet({address}): Promise<void>;                 // createDelegatedSigner via signers.addDelegated → signAndSubmit
  status: "idle"|"registering"|"signing"|"submitting"|"success"|"error"; error; reset() }
```
Passkey path = `kit.signers.addPasskey(defaultRuleId, appName, userName,
{nickname})` (runs WebAuthn registration, returns assembled tx) then
`kit.signAndSubmit(tx)` (one assertion prompt from the *existing* signer).
Guards: MAX_SIGNERS client check; duplicate detection via our
`InvalidStateError`→`credential_exists` mapping. Emits `tx:submitted`.

### `useRemoveSigner()`
```ts
{ removeSigner(target: SignerInfo): Promise<void>; status; error; reset() }
```
`kit.signers.remove(ruleId, signer)` → `signAndSubmit`. Client guard: refuse
removing the last signer of the Default rule (`last_signer` error) and warn when
removing the currently-active credential.

### `useRecovery()`
```ts
{ enroll({method: "passkey"|"ed25519", nickname?}): Promise<{credentialId?}>;
  recover({contractId?}): Promise<{contractId, credentialId}>;
  savedAddress: string | null;      // wrapper-persisted credential→contract map
  status; error; reset() }
```
`enroll` = named signer add (reuses add paths) + surfaces the wallet address for
the user to store. `recover` (fresh browser) = `kit.authenticatePasskey()` →
`kit.discoverContractsByCredential(credentialId)` (best-effort; Mercury may 500)
→ `kit.connectWallet({contractId, credentialId})`. When discovery returns
nothing, requires `contractId` from the caller (`recovery_needs_address` error
drives the UI to show an address input). Provider persists a
`credentialId→contractId` map (localStorage) on every `walletConnected` so
repeat recoveries skip the indexer. Multiple hits → surfaced for picker UI.

### `useSpendingPolicy()`
```ts
{ policy: { ruleId; token; limit: bigint; periodLedgers; spent: bigint; remaining: bigint } | null;
  setLimit({limit, period: {days?|ledgers?}, token?}): Promise<void>;
  removeLimit(): Promise<void>;
  isLoading; status; error; reset() }
```
Token defaults to native SAC. Read: find `CallContract(token)` rules carrying
`spendingLimitPolicyAddress` → `kit.policyClients.spendingLimit(addr)
.getSpendingLimitData(ruleId)` (`spending_limit`, `period_ledgers`,
`cached_total_spent` → spent/remaining). Create:
`kit.rules.add(createCallContractContext(tokenSAC), name, [activeSigner],
new Map([[policyAddr, kit.convertPolicyParams("spending_limit",
createSpendingLimitParams(limitStroops, periodLedgers))]]))` → `signAndSubmit`.
Update limit: `setSpendingLimit(limit, rule)` → `signAndSubmit`. Change period:
policy remove + re-add (client does it as one flow; the typed client has no
period setter). Remove: `kit.rules.remove(ruleId)` → `signAndSubmit`.
Units: stroops (bigint) + ledger windows (`LEDGERS_PER_HOUR/DAY/WEEK` re-exported).

## Components

All: Month 1 token system (`--sembol-*` vars), `variant`/`size` props where
applicable, ErrorToast for failures, busy states with Spinner, full keyboard +
SR support, `data-sembol` hooks for styling.

- **`<SignerList/>`** — rows: type badge, display name/nickname, "this device"
  and "primary" tags, remove button (confirm step; disabled for last signer with
  tooltip reason). Empty/loading/error states. `onRemoved` callback.
- **`<AddSignerButton/>`** — split-menu (passkey / security key / Stellar
  address) or `method` prop to pin one. Nickname input inline (Month 1 naming
  pattern). Progress: registering → approve with existing passkey → submitting.
- **`<RecoverySetup/>`** — guided card: explain → choose method → enroll →
  done (shows the wallet address with copy + "save this" callout). Also renders
  the recover flow when `mode="recover"`: passkey prompt → discovery →
  (address input fallback) → connected.
- **`<SpendingPolicyForm/>`** — current limit readout (spent/remaining bar),
  amount input + period select (hour/day/week), set/update/remove actions,
  validation (`> 0`, `InvalidLimitOrPeriod` mapped), enforcement caveat note.

## Errors (new codes)

`last_signer`, `signer_exists` (alias of credential_exists for non-passkey
signers), `spending_limit_exceeded` (ContractError 3221; also matched from
simulation diagnostics on our pre-flight simulation), `policy_not_found`,
`recovery_needs_address`. `ContractError` mapping added to `toSembolError`
(3221 → spending_limit_exceeded; 3222/3227 → invalid_input with specific
message; others → submission_failed with decoded name).

## Testing

- **Unit (vitest, mocked kit)**: each hook's happy path + error taxonomy;
  last-signer guard; duplicate credential; rule-resolution helper prefers
  policy rule; SpendingLimitData→display math (stroops/ledgers round-trips);
  component states (loading/empty/error/confirm), a11y roles/names.
- **Live testnet E2E (Playwright + virtual authenticator)**: create wallet →
  add second passkey → list shows 2 → remove it → enroll recovery passkey →
  fresh context recovery (new browser context, indexer discovery, connect) →
  set 5 XLM/day limit → 2 XLM send succeeds → 4 XLM send **rejected**
  (simulation/submission failure carrying 3221) → limit readout shows spend.
  All hashes recorded for SOW evidence.

## Out of scope here (later tasks)

Demo `/security` route, Storybook stories, a11y/security hardening pass, CI
cross-browser matrix, mainnet deployment (needs the user-side OpenZeppelin
Relayer mainnet key; note: the kit's public relayer-proxy is testnet-only by
policy — mainnet sponsorship means deploying our own proxy with that key),
stellar-wallets-kit adapter surface (D3).
