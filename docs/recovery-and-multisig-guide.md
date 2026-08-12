# Recovery, multi-signer, and spending limits

The integration guide for the account-security surface of `@sembol/passkey-react` 0.3.0:
backup signers, fresh-browser recovery, and on-chain spending limits. It assumes you already
have the basics running (provider, create/connect, balance, send) - if not, start with the
[package README](../packages/passkey-react/README.md) or
[build-a-wallet-in-an-hour](./build-a-wallet-in-an-hour.md).

Under the hood this is `smart-account-kit` 0.4.2 driving the Protocol 27 OpenZeppelin
smart-account contracts. The security features need two contract addresses beyond the Month-1
config: `ed25519VerifierAddress` (recovery keys) and `spendingLimitPolicyAddress` (limits).
Both ship in the network presets, so the recommended config is one spread:

```ts
import { SEMBOL_TESTNET_ARTIFACTS, type SembolConfig } from "@sembol/passkey-react";

const config: SembolConfig = {
  ...SEMBOL_TESTNET_ARTIFACTS, // or SEMBOL_MAINNET_ARTIFACTS
  appName: "My Stellar App",
};
```

If you keep a hand-written config from 0.2.x, add those two fields explicitly - the hooks
throw `invalid_input` with a pointed message when they're missing.

## The signer model: one rule per signer

An OpenZeppelin smart account authorizes through **context rules**. Each rule has a context
(Default for general authorization, CallContract for token-scoped rules), a set of signers,
and optional policy contracts. The part that shapes Sembol's design:

> A rule with no policy requires **all** of its signers to sign.

So putting your backup passkey on the same rule as your daily passkey would make security
*worse*: every payment would suddenly need both devices. That is the opposite of what a backup
is for.

Sembol therefore gives **each added signer its own single-signer Default rule**. N signers =
N rules = any-of-N semantics: any enrolled credential can act alone, and a lost phone is not a
lost wallet.

Consequences you'll see in the API:

- `useSigners()` flattens the signers of every Default rule into one display list
  (each `SignerInfo` carries its `ruleId`).
- Removing a signer removes its rule. (For multi-signer rules built outside Sembol,
  `useRemoveSigner` falls back to removing just the signer from the rule.)
- The account's final authorization signer can never be removed - that would lock the wallet
  forever. The attempt throws `last_signer` before anything is signed.

## Adding signers

Three signer types, one component:

```tsx
import { AddSignerButton } from "@sembol/passkey-react";

// All three methods in a menu:
<AddSignerButton
  onAdded={({ method, credentialId }) => console.log("added", method)}
  onError={(err) => toast(err.userMessage)}
/>

// Or pin one method:
<AddSignerButton method="ed25519" label="Add recovery key" variant="outline" />
```

| Method | What it adds | Prompts |
| --- | --- | --- |
| `"passkey"` | A brand-new passkey on this or another device (phone via QR, security key, password manager). | Two: register the new passkey, then approve with the current one. |
| `"ed25519"` | An Ed25519 public key (`G…`) whose secret you keep offline, verified by the deployed Ed25519 verifier contract. | One approval. |
| `"wallet"` | An existing Stellar account (`G…`) as a delegated co-signer - e.g. a Freighter or xBull address. | One approval. |

Headless, via `useAddSigner()`:

```tsx
import { useAddSigner } from "@sembol/passkey-react";

const { addPasskey, addEd25519, addWallet, status, error, reset } = useAddSigner();

// status: "idle" | "registering" | "signing" | "submitting" | "success" | "error"
const { credentialId } = await addPasskey({ nickname: "iPad" });
await addEd25519("GB3TJ4…", { nickname: "Cold key" });
await addWallet("GAAH4O…", { nickname: "Freighter" });
```

Every path ends in one passkey approval from the currently-connected signer, then a submitted
transaction that installs the new signer's own rule. `nickname` is stored on this browser only
(it is display metadata, not on-chain data).

Two notes on the non-passkey types:

- An Ed25519 recovery key signs the smart-account auth digest directly through the verifier
  contract. Sembol registers it on-chain; signing *with* it later is an advanced flow through
  the kit (`kit.externalSigners.addEd25519FromSecret(...)`), not something the React layer
  wraps yet.
- A delegated wallet signer can sign through the kit's built-in Stellar Wallets Kit adapter -
  see [stellar-wallets-kit-integration.md](./stellar-wallets-kit-integration.md).

## Recovery

Recovery is two halves: a credential enrolled **today**, and a reconnect path for the day the
primary device is gone.

### Enrollment (while the user still has the device)

```tsx
import { RecoverySetup } from "@sembol/passkey-react";

<RecoverySetup
  onEnrolled={({ credentialId }) => toast("Recovery credential enrolled")}
  onError={(err) => toast(err.userMessage)}
/>
```

`mode="setup"` (the default) offers two methods - a recovery passkey on another device, or an
offline Ed25519 key - and after enrolling it **shows the user their wallet address with a copy
button and tells them to save it**. Do not skip that part in a custom UI: on a brand-new
browser, automatic wallet discovery is best-effort, and the saved `C…` address is the fallback
that always works. Headless, the address is `useRecovery().walletAddress` (also available from
`useWalletAddress()`).

Under the hood `enroll()` is `addPasskey` / `addEd25519` with a default nickname of
`"Recovery"` - the credential lands in the same signer list as everything else, on its own
rule.

### Recovery on a fresh browser

Put the entry point somewhere that does not require a connected wallet - the reference app has
a "Lost your device? Recover access" disclosure on the landing page:

```tsx
<RecoverySetup
  mode="recover"
  onRecovered={({ contractId, credentialId }) => router.push("/dashboard")}
  onError={(err) => toast(err.userMessage)}
/>
```

The flow starts with **one passkey ceremony** that proves the credential (any resident passkey
works - no session, no stored state needed). Then the wallet address is resolved, in order:

1. **This browser's credential map.** If this browser has seen this credential before, the
   wallet address is already known locally.
2. **Public indexer reverse lookup** (Mercury-backed, best-effort). If the credential signs for
   several wallets, the outcome is a candidate list and the user picks one.
3. **Deterministic address derivation.** Succeeds only when this credential originally deployed
   the wallet (the address is derived from the deploy credential).
4. **Manual address entry.** If nothing above resolved, `recover()` throws
   `recovery_needs_address` - show an input for the address the user saved during enrollment
   and retry with `recover({ contractId })`.

A retry that names the wallet (steps 2's candidate picker or step 4's address form) reuses the
credential proved at the start - one passkey prompt per recovery flow, not one per step.
`<RecoverySetup mode="recover" />` renders all of these states (progress labels, candidate
picker, address form) for you.

Headless:

```tsx
import { useRecovery, type SembolError } from "@sembol/passkey-react";

const { recover, status, error } = useRecovery();
// status: "authenticating" → "discovering" → "connecting" (→ "choice") → "success"

async function handleRecover(contractId?: string) {
  try {
    const outcome = await recover(contractId ? { contractId } : undefined);
    if (outcome.outcome === "connected") {
      // outcome.contractId, outcome.credentialId - the provider is now connected
    } else {
      // outcome.outcome === "choose": render outcome.candidates,
      // then call handleRecover(pickedAddress)
    }
  } catch (err) {
    if ((err as SembolError).code === "recovery_needs_address") {
      // show an address input, then call handleRecover(enteredAddress)
    }
  }
}
```

## Spending limits

A spending limit caps how much of a token the wallet can send per rolling window, enforced
**on-chain** by the audited spending-limit policy contract.

### Setting a limit

```tsx
import { SpendingPolicyForm } from "@sembol/passkey-react";

<SpendingPolicyForm
  token="native"          // default: XLM
  tokenSymbol="XLM"
  onChanged={() => toast("Spending limit updated")}
  onError={(err) => toast(err.userMessage)}
/>
```

Headless:

```tsx
import { useSpendingPolicy } from "@sembol/passkey-react";

const { policy, setLimit, removeLimit, isLoading, status, error, refresh } =
  useSpendingPolicy("native");

await setLimit({ limit: "25", period: { days: 1 } });  // 25 XLM per ~1 day
await removeLimit();                                    // drops the rule entirely
```

What happens on-chain: setting a first limit installs a **token-scoped `CallContract` rule**
holding the connected signer plus the spending-limit policy contract (one passkey approval).
Changing only the amount is a single setter call (one approval). Changing the **period**
re-installs the policy on the same rule, because the deployed policy has no period setter -
that is two approvals, and the form warns about it.

### Reading spent / remaining

`policy` is `null` when no limit is set, otherwise:

```ts
{
  ruleId: number;
  tokenContract: string;
  limit: bigint;         // per window, in stroops (7-decimal base units)
  spent: bigint;         // inside the current window
  remaining: bigint;     // never negative
  periodLedgers: number; // window length in ledgers
  periodLabel: string;   // "~1 day"
}
```

Amounts are stroop-precise `bigint`s - render with `formatTokenAmount(policy.remaining, 7)`.
The hook re-reads after every Sembol-submitted transaction, so the meter moves right after a
payment confirms. `<SpendingPolicyForm />` renders the limit, a spent meter, and the remaining
amount from the same data.

### Period semantics

Windows are measured in **ledgers, not wall-clock time** - Stellar closes a ledger roughly
every 5 seconds. `period` accepts `{ hours }`, `{ days }`, `{ weeks }`, or raw `{ ledgers }`:

| Period | Ledgers |
| --- | --- |
| `{ hours: 1 }` | 720 (`LEDGERS_PER_HOUR`) |
| `{ days: 1 }` (default) | 17,280 (`LEDGERS_PER_DAY`) |
| `{ weeks: 1 }` | 120,960 (`LEDGERS_PER_WEEK`) |

Ledger times drift a little, which is why every human label is prefixed with `~`.

### What the limit covers

Enforcement is on-chain, at signing/execution time: `signAndSubmit` pins the policy-bearing
token-scoped rule when the transaction invokes that token, so the policy contract meters the
transfer and rejects anything over the limit.

The honest scope note: **the limit covers transfers built as direct token invocations** -
which is exactly how this library sends payments (`useTransfer`, `buildTransferTransaction`,
`<SignTransactionModal />`). `smart-account-kit` 0.4.2's own `kit.transfer()` wraps transfers
in `execute` and is **not** covered until the kit's next release. If you build custom sends,
invoke the token contract's `transfer` directly (or reuse `buildTransferTransaction`) to stay
inside the metered path.

### Over-limit UX

An over-limit payment is rejected by the policy contract - `ContractError #3221` - and
surfaces as a `SembolError` with `code: "spending_limit_exceeded"` and a ready-to-render
`userMessage` ("Try a smaller amount or wait for the limit window to reset"). The rejection can
appear at pre-flight simulation (before anything is signed) or at submission; both map to the
same code, so one `catch` handles it:

```tsx
try {
  await transfer({ to, amount });
} catch (err) {
  if (err.code === "spending_limit_exceeded") {
    // show err.userMessage; optionally show policy.remaining from useSpendingPolicy()
  }
}
```

This exact behavior runs against live testnet in `scripts/e2e-security.mjs`: with a 5 XLM/day
limit, a 2 XLM payment confirms and is metered, then a 4 XLM payment (over the remaining 3) is
rejected as `spending_limit_exceeded`.

## Headless usage

Every component above is a thin layer over its hook - `useSigners`, `useAddSigner`,
`useRemoveSigner`, `useRecovery`, `useSpendingPolicy` - so a fully custom security panel needs
no Sembol markup at all:

```tsx
"use client";

import {
  useSigners,
  useRemoveSigner,
  useSpendingPolicy,
  formatTokenAmount,
} from "@sembol/passkey-react";

export function SecurityPanel() {
  const { signers, isLoading, refresh } = useSigners();
  const { removeSigner } = useRemoveSigner();
  const { policy } = useSpendingPolicy();

  return (
    <section>
      <h2>Signers ({signers.length})</h2>
      <ul>
        {signers.map((s) => (
          <li key={s.key}>
            {s.nickname ?? s.display} · {s.kind}
            {s.isActive && " · this device"}
            <button
              disabled={signers.length <= 1}
              onClick={() => removeSigner(s).catch((e) => alert(e.userMessage))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {policy && (
        <p>
          Limit {formatTokenAmount(policy.limit, 7)} XLM {policy.periodLabel} ·{" "}
          {formatTokenAmount(policy.remaining, 7)} XLM remaining
        </p>
      )}
    </section>
  );
}
```

Each `SignerInfo` carries the raw on-chain `signer` and its `ruleId`, so you can hand entries
straight back to `removeSigner` or drop down to `kit.rules.*` / `kit.policies.*` for anything
the hooks don't cover. A middle ground: keep the components but pass `unstyled` and bring your
own CSS.

## New error codes in 0.3.0

All of these are `SembolError`s with a safe-to-render `userMessage`; none are in the
`recoverable` set (blind retry won't help - each needs a specific response).

| Code | Thrown by | What happened | What to do |
| --- | --- | --- | --- |
| `last_signer` | `removeSigner` / `<SignerList />` | Removing this signer would leave the account with no authorization signer - a permanent lockout. | Keep the remove action disabled for the final signer; tell the user to add another signer first. |
| `spending_limit_exceeded` | any send path (`useTransfer`, `signAndSubmit`, `<SignTransactionModal />`) | The payment exceeds the on-chain limit for the current window (`ContractError #3221`). | Show `userMessage`; offer a smaller amount or show `policy.remaining` and the window from `useSpendingPolicy()`. |
| `policy_not_found` | `removeLimit` | No spending-limit policy is installed for this token. | Treat as already-removed; refresh the policy state. |
| `recovery_needs_address` | `recover()` / `<RecoverySetup mode="recover" />` | The passkey was proven but the wallet could not be discovered (steps 1-3 all missed). | Show an address input and retry `recover({ contractId })` - no second passkey prompt. |
| `credential_exists` | `addPasskey` / `enroll` (and `createWallet` since 0.1.0) | The authenticator refused to create a duplicate credential for this app. | Explain the passkey already exists on this device; suggest enrolling from a *different* device, or an Ed25519 key instead. |

The full taxonomy (cancellations, timeouts, rp mismatches, and how raw WebAuthn
`DOMException`s map onto it) is in the package README and the Storybook *Browser
Compatibility* page.

## See it running

- Reference app security page: [`apps/demo/app/security/page.tsx`](../apps/demo/app/security/page.tsx),
  live at https://sembol-demo.vercel.app/security
- Live-testnet E2E of the whole surface: [`scripts/e2e-security.mjs`](../scripts/e2e-security.mjs)
  (add/remove signer, recovery with a storage wipe, metered and rejected payments)
- Storybook (per-component stories and prop tables): https://sembol-storybook.vercel.app
