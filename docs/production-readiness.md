# Production readiness checklist (mainnet gate)

Mainnet is gated behind this list - each row records what was verified and
where. Rows marked [ ] block the mainnet deploy; rows marked [x] are done on
the `month-2` branch.

## Code and tests

- [x] Library typecheck, demo typecheck, Storybook typecheck clean
      (`pnpm -r typecheck`)
- [x] 102 unit/component tests green (`pnpm test`)
- [x] Library builds clean (tsup ESM + DTS), Storybook production build passes
- [x] Live-testnet core journey green in CI per push (chromium, virtual
      authenticator): create -> fund -> reload-restore -> send
      (`scripts/e2e-testnet.mjs`)
- [x] Live-testnet account-security journey green (9 steps incl. add/remove
      signer, recovery after storage wipe, on-chain over-limit rejection):
      `scripts/e2e-security.mjs` (weekly + on-demand in CI)

## Cross-browser

- [x] Chromium: full passkey journeys automated in CI
- [x] Firefox + WebKit: render + capability-detection smoke automated in CI
      (`scripts/ci-browser-check.mjs`; WebAuthn automation is a
      Chromium-only platform capability - documented in the Storybook matrix)
- [ ] One manual pass on real iOS Safari + Android Chrome against the
      deployed mainnet app (hands-on, before announcing)

## Accessibility

- [x] axe-core (WCAG 2.1 A/AA rules) over onboarding, dashboard, send,
      security, history, and the open add-signer panel: zero violations of
      any severity (`scripts/a11y-audit.mjs`)
- [x] Keyboard + screen-reader affordances reviewed per component (focus
      trap in the modal, roving menu focus, `role=status/alert` on async
      states, labeled inputs, two-step destructive confirms)

## Security

- [x] Security review of the signing/recovery/policy paths recorded in
      `docs/security-review-month2.md` (rule-binding, bypass fix with
      on-chain proof, lockout guards, client-store trust model)
- [x] No secrets in the client; no private material persisted
- [ ] CSP headers on the deployed mainnet app (report-only first, then
      enforce; script-src 'self' plus Next.js requirements)
- [ ] Re-run the review checklist against the final mainnet config

## Mainnet configuration (blocked on operator inputs)

- [x] Mainnet contract set available and provenance-verified
      (`SEMBOL_MAINNET_ARTIFACTS`; deployed by the smart-account-kit team,
      fetch-back hash-verified per their deployments manifest)
- [ ] OpenZeppelin Relayer MAINNET key obtained (operator task -
      channels.openzeppelin.com; the kit's public relayer proxy is
      testnet-only by policy)
- [ ] Relayer proxy deployed with the mainnet key (kit repo's
      `relayer-proxy/` Cloudflare Worker, `NETWORK=mainnet`, or an
      equivalent minimal proxy) and its URL set as
      `NEXT_PUBLIC_RELAYER_URL` on the mainnet deployment
- [ ] Mainnet deployment target created (separate Vercel project or env:
      `NEXT_PUBLIC_*` overrides pointing at `SEMBOL_MAINNET_ARTIFACTS`
      values + mainnet RPC + relayer URL) with a clear TESTNET/MAINNET
      indicator in the UI
- [ ] Smoke on mainnet with a real (small) wallet: create, fund with real
      XLM, send a minimal payment, add + remove a signer, set + remove a
      spending limit; record hashes as SOW evidence
- [ ] Decide funding UX for mainnet (no Friendbot): document "send XLM to
      your address" onboarding in the app

## Release

- [ ] `@sembol/passkey-react@0.3.0` published to npm (operator task -
      passkey OTP)
- [ ] `month-2` merged to `main`, pushed to the public repo
- [ ] Demo + Storybook redeployed from `main`; deployment URLs re-verified
- [ ] Demo video refreshed (desktop + security flows + recovery)
- [ ] Release announcement posted (draft: `docs/release-announcement-0.3.0.md`)
