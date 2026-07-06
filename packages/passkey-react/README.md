# @sembol/passkey-react

React components and headless hooks for **Stellar passkey smart wallets**. Users sign with
Face ID / Touch ID / Windows Hello — no seed phrases, no extensions — and every wallet is an
audited [OpenZeppelin Smart Account](https://docs.openzeppelin.com/stellar-contracts/accounts/smart-account)
contract, driven by [smart-account-kit](https://github.com/kalepail/smart-account-kit).

- 🧩 **5 drop-in components** — provider, create/connect buttons, balance, signing modal
- 🪝 **7 headless hooks** — every component is a thin layer over them; bring your own UI
- 🌐 **WebAuthn edge cases handled** — capability detection, cancellations, timeouts,
  duplicate credentials, rpId mismatches → one typed, user-presentable error taxonomy
- 🎨 **CSS-variable theming** — light/dark included, Tailwind-v4-friendly, `unstyled` escape hatch
- 🖥 **SSR-safe** — works in Next.js App Router out of the box (`"use client"` baked in)
- 🧪 **Tested** — 64 unit + component smoke tests (vitest + testing-library)

## Install

```bash
npm install @sembol/passkey-react
```

Peer deps: `react` / `react-dom` 18 or 19.

## Quickstart

```tsx
import {
  PasskeyWalletProvider,
  ConnectWalletButton,
  CreateWalletButton,
  WalletBalance,
} from "@sembol/passkey-react";
import "@sembol/passkey-react/styles.css";

const config = {
  // Stellar testnet
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  // Current smart-account-kit testnet deployment
  // (testnet resets can invalidate these — see kalepail/smart-account-kit demo/.env.example):
  accountWasmHash: "a12e8fa9621efd20315753bd4007d974390e31fbcb4a7ddc4dd0a0dec728bf2e",
  webauthnVerifierAddress: "CBSHV66WG7UV6FQVUTB67P3DZUEJ2KJ5X6JKQH5MFRAAFNFJUAJVXJYV",
  appName: "My Stellar App",
};

export function App() {
  return (
    <PasskeyWalletProvider config={config}>
      <ConnectWalletButton />
      <CreateWalletButton />
      <WalletBalance />
    </PasskeyWalletProvider>
  );
}
```

That's a working wallet: **Create** registers a passkey, deploys the smart account on-chain,
and (on testnet) funds it via Friendbot. **Connect** silently restores the previous session on
page load and prompts for a passkey otherwise. **Balance** live-reads XLM and auto-refreshes
after every transaction.

### Send a payment with an approval screen

```tsx
import {
  buildTransferTransaction,
  SignTransactionModal,
  usePasskeyWallet,
} from "@sembol/passkey-react";

function Send() {
  const { kit, config } = usePasskeyWallet();
  const [tx, setTx] = useState(null);

  const prepare = async () => {
    setTx(await buildTransferTransaction(kit!, {
      tokenContract: config.nativeTokenContract,
      to: "G…",
      amount: "12.5",
    }));
  };

  return (
    <>
      <button onClick={prepare}>Review & sign</button>
      <SignTransactionModal
        open={!!tx}
        transaction={tx}
        onClose={() => setTx(null)}
        onSuccess={({ hash }) => console.log("confirmed", hash)}
      />
    </>
  );
}
```

The modal shows a decoded summary (contract, function, args, max fee, network), runs the full
**sign → re-simulate → submit** flow on approve, and reports the hash with a stellar.expert link.

Prefer one-call sends without an approval screen? `useTransfer()` wraps `kit.transfer`.

## Components

| Component | Purpose |
| --- | --- |
| `<PasskeyWalletProvider config kit?>` | Creates and shares the smart-account-kit instance; runs silent session restore (`autoConnect`), capability detection, and event-driven state sync. |
| `<CreateWalletButton />` | Passkey registration → contract deployment → (testnet) funding, with per-phase progress labels. Props: `userName`, `nickname`, `fund`, `label`, `unstyled`, `onSuccess`, `onError`. |
| `<ConnectWalletButton />` | Session restore / passkey prompt; renders an account chip with copy / explorer / switch / disconnect menu when connected. |
| `<WalletBalance />` | Live balance with skeleton, error state, auto + manual refresh. Props: `token`, `address`, `refreshInterval`, `showRefresh`, `unstyled`. |
| `<SignTransactionModal />` | Accessible approval dialog (focus trap, Escape, `aria-modal`) driving `signAndSubmit`. Props: `open`, `transaction`, `title`, `description`, `signOptions`, `onClose`, `onSuccess`, `onError`, `unstyled`. |

All components take `className` and `unstyled` — with `unstyled` they render bare, semantic
markup for your own styles.

## Hooks (headless layer)

| Hook | Returns |
| --- | --- |
| `usePasskeyWallet()` | `{ kit, status, address, credentialId, isConnected, error, capabilities, config, connect, createWallet, disconnect, fund }` |
| `useCreateWallet()` | `{ createWallet, status, phase, error, result, reset }` — `phase`: `"passkey" \| "deploying" \| "funding"` |
| `useConnectWallet()` | `{ connect, status, error, reset }` |
| `useSignTransaction()` | `{ sign, signAndSubmit, status, error, result, reset }` — status: `signing → submitting → success` |
| `useTransfer()` | `{ transfer({ to, amount, token? }), status, error, result, reset }` with address/amount validation |
| `useWalletBalance(opts?)` | `{ raw, formatted, symbol, decimals, status, error, refetch, isRefreshing }` — auto-refetch after every submitted tx |
| `useWalletAddress()` | `{ address, displayAddress, explorerUrl, copy, copied }` |

Utilities: `buildTransferTransaction`, `buildContractCallTransaction`, `summarizeTransaction`,
`detectWebAuthnCapabilities`, `toSembolError`, `formatTokenAmount`, `parseTokenAmount`,
`truncateAddress`, `explorerUrl`. Storage adapters and `SmartAccountKit` are re-exported for
advanced use.

## Configuration

```ts
interface SembolConfig {
  rpcUrl: string;                     // required
  networkPassphrase: string;          // required
  accountWasmHash: string;            // required — smart-account WASM on your network
  webauthnVerifierAddress: string;    // required — deployed secp256r1 verifier
  nativeTokenContract?: string;       // default: derived native SAC
  appName?: string;                   // WebAuthn rpName (passkey prompt)
  rpId?: string;                      // WebAuthn relying-party ID (default: current domain)
  relayerUrl?: string;                // optional fee-sponsoring proxy (see below)
  indexerUrl?: string | false;        // contract discovery (testnet default built in)
  storage?: StorageAdapter;           // IndexedDB by default
  sessionExpiryMs?: number;           // default 7 days
  timeoutInSeconds?: number;          // default 30
  signatureExpirationLedgers?: number;// default 720 (~1h)
  defaultPolicies?: PolicyConfig[];   // policies installed at wallet creation
  autoConnect?: boolean;              // silent session restore on mount (default true)
  webAuthn?: {...};                   // custom WebAuthn impl (testing/virtual authenticators)
  webAuthnHints?: ("client-device" | "hybrid" | "security-key")[];
                                      // preference order for passkey prompts, e.g.
                                      // ["client-device", "hybrid"] surfaces Touch ID /
                                      // Windows Hello first on connect as well as create
}
```

### Fee sponsoring (production)

Without `relayerUrl`, transactions are submitted via RPC with the kit's deterministic deployer
keypair as fee source — perfect for testnet, not for mainnet. For production, run an
[OpenZeppelin Relayer](https://docs.openzeppelin.com/relayer) proxy that attaches your API key
server-side and set `relayerUrl` to it. Testnet relayer keys are self-serve:
`curl https://channels.openzeppelin.com/testnet/gen`. The reference app ships a ready-made
proxy route (`/api/relayer`).

## Error handling

Everything throws `SembolError`:

```ts
try {
  await createWallet();
} catch (err) {
  err.code;        // "user_cancelled" | "credential_exists" | "webauthn_unsupported" | …
  err.userMessage; // safe to render to end users
  err.recoverable; // true → offer a retry
}
```

Codes: `webauthn_unsupported`, `user_cancelled`, `credential_exists`, `rp_mismatch`,
`authenticator_constraint`, `wallet_not_connected`, `wallet_not_found`, `session_expired`,
`simulation_failed`, `submission_failed`, `timeout`, `invalid_input`, `storage_error`,
`network_error`, `unknown`. See the Storybook *Browser Compatibility* page for how raw
WebAuthn `DOMException`s map onto these.

## Theming

The stylesheet is a set of `--sembol-*` CSS custom properties (colors, radii, fonts, shadows)
with automatic dark mode (`prefers-color-scheme`) and an explicit override
(`<html data-sembol-theme="dark">`). Override any variable in your CSS, map them to Tailwind v4
`@theme` tokens, or pass `unstyled` and ignore the stylesheet entirely. Full token table in the
Storybook *Theming* page.

## Testing your integration

Inject a fake kit through the provider's `kit` prop, or pass a custom `webAuthn` implementation
in the config (this is how the library's own 64-test suite works — see `tests/helpers/fakeKit.ts`
in the repo). For E2E, Chromium's virtual-authenticator CDP works with real testnet flows.

## License

MIT
