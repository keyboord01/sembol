# Security review: account-security layer (Month 2)

Date: 2026-08-02 · Scope: `@sembol/passkey-react` 0.3.0 signing, recovery, and
policy paths, as shipped in `sembol-dev@month-2`. Reviewer: project team.
Method: source review of the library and the relevant smart-account-kit 0.4.2
internals (compiled dist), plus live-testnet adversarial checks
(`scripts/e2e-security.mjs`, on-chain state probes).

## Trust model

- **The chain is the enforcement boundary.** Every mutation of the account
  (add/remove signer, rule changes, policy changes, transfers) is authorized
  by the smart-account contract itself: a WebAuthn (or Ed25519 / delegated)
  signature over an auth digest that binds the transaction, an expiration
  ledger, and the context-rule ids the signature is valid under. Nothing the
  client stores or displays can move funds without a fresh signature.
- **The client is a convenience layer.** localStorage (nicknames,
  credential-to-wallet map), IndexedDB (kit session), and React state only
  affect what the UI shows and which ceremonies get requested. Poisoning them
  can degrade UX, not authorize transactions.
- **XSS is out of scope but consequential**: an attacker who can run script on
  the page can request ceremonies the user might approve. This is inherent to
  every web wallet; mitigations are the standard ones (no third-party script
  injection in the reference app, CSP recommended for adopters, WebAuthn
  prompts always show the RP).

## Findings and verifications

### 1. Signature binding (verified against kit internals)

The kit computes `auth_digest = sha256(signature_payload ++
context_rule_ids.to_xdr())` and the signer signs the digest; the payload
carried on-chain includes the rule ids, and the contract recomputes and
verifies the digest before enforcing exactly those rules. Signatures cannot be
replayed under different rules (rule-downgrade defense, upstream design).
Expirations bound signature lifetime (default 720 ledgers, ~1 hour).

### 2. Rule-resolution bypass (found during review, fixed)

smart-account-kit 0.4.2's automatic rule resolution has no
scoped-over-Default preference: with a policy-bearing token-scoped rule and a
policy-free Default rule both matching a transfer, it can bind the Default
rule, and the account then never consults the spending-limit policy. We
demonstrated this live (transfers sailed past a set limit; the policy's
on-chain `cached_total_spent` stayed 0), then fixed it: Sembol's core sign
path (`useSignTransaction.signAndSubmit`, also `useTransfer`) derives the
invoked contract from the transaction's auth entries and pins the
policy-bearing rule via `resolveContextRuleIds`. Re-verified live: in-limit
transfer metered on-chain, over-limit transfer rejected with contract error
3221.

Residual risk, stated honestly: transfers submitted through the kit's own
`kit.transfer()` (execute-wrapped in 0.4.2) or by a third-party client that
binds a Default rule are not limited. For a signer that must be hard-bounded,
enroll it ONLY on the token-scoped policy rule (no Default-rule membership) -
then no policy-free rule can match it at all. The demo's self-limit is a
guardrail; the delegated-signer configuration is the security boundary.

### 3. Signer model lockout hazards (found during design, fixed)

A policy-less rule requires ALL of its signers to sign. Adding a backup
passkey to the deploy rule therefore bricks single-signer flows (verified
live before the fix). Sembol creates each added signer on its own
single-signer Default rule (any-of-N). `useRemoveSigner` re-reads rules at
action time and refuses to remove the account's final authorization signer
(`last_signer`), removing the self-lockout path. Removing the currently
active credential is allowed but warned in the UI (the session dies with it).

### 4. Recovery path

- Recovery requires a live WebAuthn assertion (`authenticatePasskey`) - the
  wallet address alone (public data) recovers nothing. One ceremony per flow;
  the address-fallback retry reuses the credential proved seconds earlier
  (same tab, same React state - no persistence of the proof).
- Wallet resolution order: this browser's credential map -> public indexer ->
  deterministic address (deploy credential only) -> manual address. A
  malicious indexer response or poisoned local map could point the UI at the
  wrong contract, but connecting is only a session pointer: signing anything
  from the wrong wallet fails at the contract unless the credential is
  genuinely enrolled there.
- Enrollment tells the user to save the wallet address - discovery
  infrastructure is best-effort by design.

### 5. Spending-limit correctness

- Units are stroops end to end (`bigint`); no float math touches amounts.
  Client-side parse rejects non-positive values; the contract enforces
  `InvalidLimitOrPeriod` for zero limit/period.
- The window is a rolling ledger window maintained by the policy contract
  (`spending_history` + `cached_total_spent` verified on-chain during E2E).
  The UI meter reads contract state, not client accounting.
- Period changes re-install the policy (remove + add on the same rule): two
  separate approvals, each independently signed. The spent history resets
  with a re-install - documented in the form's UI copy.

### 6. Client-side stores

| Store | Contents | Worst case if tampered |
| --- | --- | --- |
| localStorage `sembol:signer-names:<contract>` | display nicknames | wrong label shown; on-chain identity (key/credential) still displayed alongside |
| localStorage `sembol:wallet:<credentialId>` | credential -> contract hint | recovery UI opens the wrong (or no) wallet; signing still gated by enrollment |
| IndexedDB (kit) | session + pending credentials | session hijack shows balances; every mutation still needs a fresh passkey |

No secrets, private keys, or signatures are ever persisted by Sembol; the
passkey private key never leaves the authenticator.

### 7. Input validation

Addresses are StrKey-checksum validated (`StrKey.isValidEd25519PublicKey`,
regex + kit-side `createDelegatedSigner` checksum checks); rule names are
byte-truncated to the contract's 20-byte cap before submission; amounts run
through the shared `parseTokenAmount` (decimal-exact). Errors map to the
typed `SembolError` taxonomy - no raw contract diagnostics reach end users,
while `cause` preserves them for developers.

## Recommendations carried forward

1. Ship the direct-token-invocation note prominently in adopter docs (done:
   README + guide + Storybook).
2. Revisit the rule-pin once smart-account-kit releases the upstream fix
   (direct invocations + scoped-rule preference in `kit.transfer`); the pin
   stays correct but becomes redundant for the kit path.
3. For mainnet: add a CSP to the reference app, pin the relayer proxy origin,
   and re-run this review against the mainnet config before launch (tracked
   in docs/production-readiness.md).
