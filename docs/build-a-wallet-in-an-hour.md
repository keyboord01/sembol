# Build a Stellar passkey wallet in an hour

Zero to a working wallet - create with Face ID / Touch ID, see a live balance, send XLM through
an approval screen, enroll recovery, and cap spending with an on-chain limit. Everything runs
on Stellar **testnet** with the published package and preset config; no contracts to deploy, no
API keys, no env vars.

Written against `@sembol/passkey-react` 0.3.0 (Next.js App Router; any React 18/19 bundler
setup works the same way). You need Node >= 20 and a browser with a platform authenticator
(Touch ID, Windows Hello, or Android/iOS screen lock). Passkeys work on `http://localhost` -
it counts as a secure context.

The budget:

| Clock | Step |
| --- | --- |
| 0:00 | Scaffold + install |
| 0:05 | Provider + styles |
| 0:10 | Landing page: create / connect / recover |
| 0:20 | Wallet page: address + live balance |
| 0:30 | Send XLM with an approval modal |
| 0:45 | Security page: signers, recovery, spending limit |
| 0:52 | Prove the limit: watch an over-limit payment get rejected |
| 0:57 | Recovery drill: wipe storage, get back in |
| 1:00 | Done - where to go next |

## 0:00 - Scaffold and install

```bash
npx create-next-app@latest hour-wallet --typescript --app --no-tailwind
cd hour-wallet
npm install @sembol/passkey-react
npm run dev
```

One package. It wraps `smart-account-kit` (the audited OpenZeppelin smart-account stack,
Protocol 27 contracts) and pulls it in as a dependency.

## 0:05 - Provider and styles

The config is a one-spread preset: RPC URL, network passphrase, and the deployed contract set
(account WASM, WebAuthn + Ed25519 verifiers, spending-limit policy, native token).

`app/providers.tsx`:

```tsx
"use client";

import {
  PasskeyWalletProvider,
  SEMBOL_TESTNET_ARTIFACTS,
  type SembolConfig,
} from "@sembol/passkey-react";

const config: SembolConfig = {
  ...SEMBOL_TESTNET_ARTIFACTS,
  appName: "Hour Wallet", // shown in the passkey prompt
};

export function Providers({ children }: { children: React.ReactNode }) {
  return <PasskeyWalletProvider config={config}>{children}</PasskeyWalletProvider>;
}
```

`app/layout.tsx` - import the stylesheet and wrap the app:

```tsx
import type { Metadata } from "next";
import "@sembol/passkey-react/styles.css";
import { Providers } from "./providers";

export const metadata: Metadata = { title: "Hour Wallet" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

The provider creates the kit instance, runs silent session restore on mount, and shares wallet
state with every component and hook below.

## 0:10 - Landing page: create, connect, recover

`app/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ConnectWalletButton,
  CreateWalletButton,
  RecoverySetup,
  usePasskeyWallet,
} from "@sembol/passkey-react";

export default function Home() {
  const router = useRouter();
  const { isConnected } = usePasskeyWallet();

  // Covers create, connect, session restore, and recovery in one place.
  useEffect(() => {
    if (isConnected) router.replace("/wallet");
  }, [isConnected, router]);

  return (
    <main style={{ maxWidth: 420, margin: "4rem auto", display: "grid", gap: 12 }}>
      <h1>Hour Wallet</h1>
      <CreateWalletButton />
      <ConnectWalletButton />
      <details>
        <summary>Lost your device? Recover access</summary>
        <RecoverySetup mode="recover" onError={(err) => alert(err.userMessage)} />
      </details>
    </main>
  );
}
```

**Check it:** click *Create wallet*. You get a passkey prompt, then per-phase progress
(passkey → deploying → funding): the button registers the credential, deploys your smart
account on-chain, and funds it with 10,000 testnet XLM via Friendbot. You land on `/wallet`
(next step) as soon as the provider reports connected. *Connect* restores the session silently
on later visits. The recover path becomes interesting at 0:57.

## 0:20 - Wallet page: address and live balance

`app/wallet/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import {
  WalletBalance,
  usePasskeyWallet,
  useWalletAddress,
} from "@sembol/passkey-react";

export default function WalletPage() {
  const { isConnected, disconnect } = usePasskeyWallet();
  const { address, copy, copied, explorerUrl } = useWalletAddress();

  if (!isConnected) {
    return (
      <main style={{ maxWidth: 560, margin: "4rem auto" }}>
        <p>
          No wallet connected. <Link href="/">Back to start</Link>
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 560, margin: "4rem auto", display: "grid", gap: 16 }}>
      <h1>Your wallet</h1>
      <p style={{ wordBreak: "break-all" }}>
        <code>{address}</code>{" "}
        <button onClick={() => void copy()}>{copied ? "Copied!" : "Copy"}</button>{" "}
        {explorerUrl && (
          <a href={explorerUrl} target="_blank" rel="noreferrer">
            View on stellar.expert
          </a>
        )}
      </p>
      <WalletBalance />
      <nav style={{ display: "flex", gap: 12 }}>
        <Link href="/security">Security</Link>
        <button onClick={() => void disconnect()}>Disconnect</button>
      </nav>
    </main>
  );
}
```

**Check it:** the balance reads 10,000 XLM (skeleton while loading, auto-refreshes after every
transaction). Your wallet is a `C…` contract address - open the explorer link and look at it
on-chain.

## 0:30 - Send XLM with an approval modal

Add a send form to the wallet page. `buildTransferTransaction` builds the transfer as a direct
token invocation (that detail pays off at 0:52), and `<SignTransactionModal />` shows a decoded
summary, then runs sign → re-simulate → submit on approve.

Add to `app/wallet/page.tsx` (inside the connected branch):

```tsx
import { useState } from "react";
import {
  SignTransactionModal,
  buildTransferTransaction,
  type SembolError,
} from "@sembol/passkey-react";

type PreparedTx = Awaited<ReturnType<typeof buildTransferTransaction>>;

function SendXlm() {
  const { kit, config } = usePasskeyWallet();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [tx, setTx] = useState<PreparedTx | null>(null);
  const [lastHash, setLastHash] = useState<string | null>(null);

  const prepare = async () => {
    try {
      setTx(
        await buildTransferTransaction(kit!, {
          tokenContract: config.nativeTokenContract,
          to,
          amount,
        }),
      );
    } catch (err) {
      alert((err as SembolError).userMessage);
    }
  };

  return (
    <section style={{ display: "grid", gap: 8 }}>
      <h2>Send XLM</h2>
      <input placeholder="Recipient (G… or C…)" value={to} onChange={(e) => setTo(e.target.value)} />
      <input placeholder="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button onClick={() => void prepare()}>Review &amp; sign</button>
      {lastHash && <p>Confirmed: {lastHash.slice(0, 10)}…</p>}
      <SignTransactionModal
        open={!!tx}
        transaction={tx}
        onClose={() => setTx(null)}
        onSuccess={({ hash }) => {
          setLastHash(hash);
          setTx(null);
        }}
        onError={(err) => alert(err.userMessage)}
      />
    </section>
  );
}
```

Render `<SendXlm />` under `<WalletBalance />`.

**Check it:** send 25 XLM to any testnet address (the repo's E2E uses
`GAAH4OT36RRCCAGKARGPN2HLHT2NOBVFHO4GUHA6CF7UKQ4MMV24WQ4N`; a second wallet in another browser
profile works too). The modal decodes the call (contract, function, args, max fee, network);
approve with your passkey and the balance updates itself.

Prefer no approval screen? `useTransfer()` is the same flow in one call.

## 0:45 - Security page: signers, recovery, spending limit

This is the 0.3.0 surface: multi-signer, recovery enrollment, and an on-chain spending cap.
Four components, one page.

`app/security/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import {
  AddSignerButton,
  RecoverySetup,
  SignerList,
  SpendingPolicyForm,
  usePasskeyWallet,
  type SembolError,
} from "@sembol/passkey-react";

export default function SecurityPage() {
  const { isConnected } = usePasskeyWallet();
  const showError = (err: SembolError) => alert(err.userMessage);

  if (!isConnected) {
    return (
      <main style={{ maxWidth: 560, margin: "4rem auto" }}>
        <p>
          No wallet connected. <Link href="/">Back to start</Link>
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 560, margin: "4rem auto", display: "grid", gap: 24 }}>
      <h1>Security</h1>

      <section>
        <h2>Signers</h2>
        <p>Every signer can approve transactions on its own (any-of-N).</p>
        <SignerList onError={showError} />
        <AddSignerButton onError={showError} />
      </section>

      <section>
        <h2>Recovery</h2>
        <p>Enroll a backup credential now, while you still have this device.</p>
        <RecoverySetup onError={showError} />
      </section>

      <section>
        <h2>Spending limit</h2>
        <p>Over-limit payments are rejected on-chain by the spending-limit policy contract.</p>
        <SpendingPolicyForm onError={showError} />
      </section>

      <Link href="/wallet">Back to wallet</Link>
    </main>
  );
}
```

**Check it:**

1. The signer list shows one passkey tagged *This device*, with removal disabled - the last
   signer can never be removed (that would lock the account forever).
2. *Add signer* → *New passkey*: two prompts (register the new passkey, approve with the
   current one), and a second signer appears. Each signer lives on its own single-signer rule,
   so any one of them can act alone.
3. Under *Recovery*, enroll a recovery passkey (pick your phone via QR, a security key, or a
   password manager). When it finishes, the component shows your wallet address and a copy
   button. **Actually save it** - it is the fallback if automatic discovery cannot find your
   wallet later.
4. Set a spending limit: 5 XLM, window "per day", one passkey approval. The form now shows the
   limit with a spent/remaining meter. (Windows are ledger-based: ~5s per ledger, so "per day"
   means ~17,280 ledgers.)

## 0:52 - Prove the limit on-chain

Back on the wallet page:

1. Send 2 XLM - approves and confirms normally. The security page's meter now shows 2 spent,
   3 remaining.
2. Send 4 XLM - **rejected**. The policy contract refuses it (`ContractError #3221`), which
   surfaces as a `SembolError` with code `spending_limit_exceeded` and the message about trying
   a smaller amount or waiting for the window to reset.

Nothing in your app enforced that. The smart account did, on-chain.

One honest scope note: the limit covers transfers built as direct token invocations - which is
what `buildTransferTransaction` / `useTransfer` produce. smart-account-kit 0.4.2's own
`kit.transfer()` wraps transfers in `execute` and is not covered until the kit's next release.

## 0:57 - Recovery drill

Simulate losing this browser without losing the passkey:

1. DevTools → Application → Storage → **Clear site data** (passkeys survive - they live in the
   platform authenticator, not in site storage).
2. Reload. You're logged out, sessions gone.
3. On the landing page open *Lost your device? Recover access* → *Recover with passkey* and
   approve with **either** enrolled passkey.

One passkey ceremony, then the wallet is resolved automatically: this browser's credential
map, then a public-indexer lookup, then deterministic derivation for the original deploy
credential. If all three miss (common for a brand-new wallet the indexer hasn't seen), the
component asks for the wallet address you saved at 0:45 - paste it and you're back in, with no
second passkey prompt.

## 1:00 - What you have

A passkey wallet on an audited smart-account contract: create/connect, live balance, payments
behind an approval screen, N backup signers (any-of-N), a rehearsed recovery path, and a
spending limit enforced by the chain instead of your frontend.

Where to go next:

- [recovery-and-multisig-guide.md](./recovery-and-multisig-guide.md) - the full account-security
  API: headless hooks, error codes, period semantics, enforcement scope.
- Reference app (this walkthrough, production-shaped): https://sembol-demo.vercel.app -
  source in [`apps/demo`](../apps/demo).
- Storybook - every component and hook with live-testnet stories: https://sembol-storybook.vercel.app
- Package: https://www.npmjs.com/package/@sembol/passkey-react ·
  Source: https://github.com/keyboord01/sembol
- Going to mainnet: swap the preset for `SEMBOL_MAINNET_ARTIFACTS` and set up fee sponsoring
  (`relayerUrl` + an OpenZeppelin Relayer proxy) - see the package README's
  "Fee sponsoring" section.
