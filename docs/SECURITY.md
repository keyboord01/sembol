# Sembol Cloud security model

Sembol Cloud is the fee-sponsorship relayer that lets an app create and use
Stellar smart-account wallets without the end user holding XLM. This document
covers the server-side secrets it holds, what each can and cannot do, what a
leak actually costs, and how to rotate.

Scope: the `/api/relayer` route and `lib/sponsor.ts` + `lib/channel-lease.ts`
in the demo app. This is the v0 (capped-beta) design; production hardening
notes are called out inline.

## What Sembol Cloud is (and is not)

- It **pays transaction fees**. It is a funded fee source plus a submission
  service that speaks the smart-account-kit relayer protocol
  (`{func, auth[]}` and `{xdr}` fee-bump).
- It **never controls user wallets.** A Sembol wallet is an OpenZeppelin smart
  account owned by the user's passkey. The relayer only pays for and submits
  transactions the user's passkey already authorized. It cannot move a user's
  funds, add a signer, or change a policy: those all require the passkey
  signature, which the relayer does not have and never sees.
- It is **not custody.** No user key material passes through this service.

The strongest security property: **compromising Sembol Cloud completely does
not compromise a single user wallet.** The blast radius is bounded to the XLM
we put in the channel accounts.

## Secrets the route holds

All secrets are server-side environment variables. None are `NEXT_PUBLIC_*`;
none reach the browser. The only public value the client learns is the relayer
URL (`NEXT_PUBLIC_RELAYER_URL=/api/relayer`), which is just an endpoint.

### 1. Channel account secret keys — `SPONSOR_KEYS_JSON`

A JSON map of project key → `{ secrets: ["S..."], maxFeeXlm }`. Each `secrets`
entry is the Stellar secret key of a **channel account**: a plain funded Stellar
account whose only job is to be the fee source (and, for host-function
submissions, the transaction source) and to pay fees.

- **What it can do:** spend the XLM held by that channel account — on fees, or
  (if stolen) on anything, since whoever holds the secret controls the account.
- **What it cannot do:** touch any user's smart-account wallet. Channel accounts
  are not signers on user wallets. They are not the smart-account deployer in
  any privileged sense (the kit's shared deployer is sign-only and separately
  hardened on mainnet).
- **Blast radius of a leak:** exactly the balance sitting in the leaked channel
  accounts, nothing more. This is the whole point of the budget model below.

### 2. Redis credentials (production) — `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`)

Used only for the per-channel lease that prevents sequence-number collisions
under concurrency. Holds ephemeral lock keys (`sembol:lease:<project>:<channel>`)
with a 90-second TTL. No funds, no user data, no secret keys are stored in
Redis.

- **Blast radius of a leak:** an attacker who can write to this Redis could
  wedge channel leases (a denial-of-service on sponsorship throughput) or clear
  them (reintroducing the sequence race, which degrades to failed submissions,
  not lost funds). No financial loss, no wallet compromise. Still, treat it as
  a real credential and scope the token to this database.

### 3. Upstream relayer API key (mainnet path) — `RELAYER_API_KEY` + `RELAYER_UPSTREAM_URL`

Only set in forward-proxy mode, when `/api/relayer` forwards to a self-hosted
OpenZeppelin Relayer instead of sponsoring natively. The key authenticates to
that relayer.

- **Blast radius of a leak:** an attacker could submit fee-sponsored
  transactions through your OZ relayer up to its own configured limits, i.e.
  drain the budget that relayer is willing to sponsor. Same shape of loss as a
  channel-key leak (bounded XLM), plus whatever rate/allowlist controls the OZ
  relayer enforces. It still cannot touch user wallets.

## The budget model is the security model

Sembol Cloud v0 does not trust a soft "spending limit" variable that code could
get wrong. The limit is **physical**:

1. Each project key maps to its own dedicated channel accounts.
2. Each channel account is funded with only its allotted float.
3. **When the float is spent, sponsorship stops** — the account cannot pay fees
   it does not have. The on-chain balance *is* the hard cap.
4. A per-request ceiling (`maxFeeXlm`) additionally rejects any single
   transaction whose assembled fee exceeds the cap, before signing, so a single
   malicious or malformed request cannot burn the whole float at once.

Consequences that matter:

- A leaked channel key loses at most that account's float. Fund channels with
  what you are willing to lose, not a treasury.
- One project's abuse cannot spend another project's budget: separate keys,
  separate accounts, separate balances.
- There is no code path where "the limit check was skipped" leads to unbounded
  loss. The worst case is bounded by what is on-chain.

## Abuse controls at the edge

- **Same-origin by default.** Cross-origin browsers are refused unless their
  origin is in `RELAYER_ALLOWED_ORIGIN`. This stops a random site from spending
  your float from a user's browser.
- **Project selection** via the `X-Sembol-Key` header selects which project's
  channels (and budget) a request draws from; unknown keys are rejected
  (`UNAUTHORIZED`). In v0 these keys are hand-issued.
- **Fee ceiling** (`maxFeeXlm`) per project key, enforced before submission.
- **Simulation gate**: host-function submissions are simulated first; a failing
  simulation is rejected without spending anything.

Production hardening (tracked, not all in v0): per-key rate limiting, an
allowlist of sponsorable contract/operation shapes, and per-key daily budget
counters in Redis on top of the physical float.

## Concurrency and the lease

Channel accounts have sequence numbers; two concurrent submissions on the same
channel would read the same sequence and one would fail (`tx_bad_seq`). Each
request therefore takes an **exclusive lease** on a channel for the duration of
build → submit → on-chain confirmation, so no two in-flight requests share a
channel's sequence. See `lib/channel-lease.ts`.

- Production (multi-instance) uses Redis (`SET NX PX`) so the lease holds across
  every serverless instance and region.
- Without Redis, the lease is in-process only — correct for a single-instance
  v0, verified by `scripts/e2e-sponsor-concurrency.mjs` (10 parallel
  sponsorships, 0 `tx_bad_seq`), and it logs a one-time warning. **Provision
  Redis before scaling beyond one instance.**

Leases carry a 90-second TTL (longer than the function's max duration) so a
crashed request can never wedge a channel permanently.

## Rotation

**Channel keys (`SPONSOR_KEYS_JSON`) — routine, do this on a schedule and on any suspicion:**

1. Generate fresh channel accounts and fund them from your ops account.
2. Update `SPONSOR_KEYS_JSON` with the new secrets (add alongside the old ones
   for a zero-downtime overlap, or replace outright).
3. Redeploy so the route picks up the new env.
4. Sweep any remaining XLM from the old channel accounts back to the ops
   account (`ACCOUNT_MERGE` or a payment), then abandon them.
5. Because a channel key only ever holds its float, rotation is low-stakes and
   cheap — do it often.

**Redis token:** rotate from the Vercel/Upstash dashboard, update
`KV_REST_API_TOKEN`, redeploy. No data migration needed (leases are ephemeral).

**Upstream relayer key (`RELAYER_API_KEY`):** rotate at the OZ relayer, update
the env, redeploy.

**On a confirmed leak:** rotate the affected secret immediately per above, and
for a channel-key leak, sweep the funds first (you are racing the attacker for a
bounded amount, which is exactly why the float is capped).

## Telemetry and privacy

Sembol Cloud measures **its own service**, through OpenTelemetry (`@vercel/otel`) plus one
structured log line per request. For each sponsorship attempt it records: which project made it,
whether it created a wallet or sponsored an existing one, the network, success or failure, the error
code when it failed, and how long it took.

**It never records:**

- wallet or contract addresses
- transaction hashes, host-function arguments, or authorization entries
- IP addresses, cookies, device or browser identifiers
- anything that could identify or follow an individual person

`project` identifies a paying project, which is a business, never a user. Counting requests to our
own API is not user tracking, and the implementation keeps it that way by emitting counts and
outcomes rather than identities. See `lib/telemetry.ts`.

**The library sends nothing.** `@sembol/passkey-react` runs inside other developers' applications, in
their users' browsers. Those users have no relationship with us and never agreed to anything, so the
library phones home about nothing at all. If SDK adoption telemetry is ever added it must be opt-in
by the integrating developer, off by default, and documented in the README.

**The website** (sembol.xyz) uses Vercel Web Analytics, which is cookieless and does not build
profiles or follow visitors between sites.

## What is deliberately out of scope for v0

- Public self-serve key issuance (keys are hand-issued in the capped beta).
- Custody of any user key material (there is none, by design).
- Mainnet native sponsoring at scale: mainnet runs through the forward-proxy to
  a self-hosted OpenZeppelin Relayer, whose own budget, allowlist, and channel
  hardening apply on top of everything here.
