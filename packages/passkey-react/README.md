# @sembol/passkey-react

React components and headless hooks for **Stellar passkey smart wallets**. Users sign with
Face ID / Touch ID / Windows Hello - no seed phrases, no extensions - and every wallet is an
audited [OpenZeppelin Smart Account](https://docs.openzeppelin.com/stellar-contracts/accounts/smart-account)
contract, driven by [smart-account-kit](https://github.com/kalepail/smart-account-kit).

- 🧩 **9 drop-in components** - provider, create/connect buttons, balance, signing modal,
  signer list + add-signer, recovery setup, spending-limit form
- 🪝 **12 headless hooks** - every component is a thin layer over them; bring your own UI
- 🔐 **Account security built in** - add backup devices and recovery keys (any-of-N),
  recover on a fresh browser, cap spending with the on-chain spending-limit policy
- 🌐 **WebAuthn edge cases handled** - capability detection, cancellations, timeouts,
  duplicate credentials, rpId mismatches → one typed, user-presentable error taxonomy
- 🎨 **CSS-variable theming** - light/dark included, Tailwind-v4-friendly, `unstyled` escape hatch
- 🖥 **SSR-safe** - works in Next.js App Router out of the box (`"use client"` baked in)
- 🧪 **Tested** - 102 unit + component smoke tests (vitest + testing-library), plus live-testnet E2E journeys

## Install

```bash
npm install @sembol/passkey-react
```

Peer deps: `react` / `react-dom` 18 or 19. Use with a bundler (Next.js, Vite, webpack, etc.) -
the underlying `smart-account-kit` ships ESM that a bundler resolves but bare Node ESM does not.

## Quickstart

```tsx
import {
  PasskeyWalletProvider,
  ConnectWalletButton,
  CreateWalletButton,
  WalletBalance,
  SEMBOL_TESTNET_ARTIFACTS,
} from "@sembol/passkey-react";
import "@sembol/passkey-react/styles.css";

const config = {
  // Protocol 27 contract set (account WASM, verifiers, spending-limit policy)
  // deployed + provenance-verified by the smart-account-kit team. A mainnet
  // preset (SEMBOL_MAINNET_ARTIFACTS) ships too. Testnet resets can
  // invalidate the testnet set - every field can be overridden.
  ...SEMBOL_TESTNET_ARTIFACTS,
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

Prefer one-call sends without an approval screen? `useTransfer()` gives you the whole flow
in one call.

### Account security: recovery, co-signers, spending limits

```tsx
import {
  SignerList,
  AddSignerButton,
  RecoverySetup,
  SpendingPolicyForm,
} from "@sembol/passkey-react";

function Security() {
  return (
    <>
      <SignerList />          {/* every signer, with guarded removal */}
      <AddSignerButton />     {/* new passkey, Ed25519 recovery key, or G-address */}
      <RecoverySetup />       {/* guided recovery enrollment */}
      <SpendingPolicyForm />  {/* on-chain spending limit per window */}
    </>
  );
}

// On a fresh device (nothing installed, wallet lost):
<RecoverySetup mode="recover" onRecovered={({ contractId }) => ...} />
```

Each added signer lives on its own single-signer authorization rule, so **any** enrolled
credential can act alone (a lost phone is not a lost wallet). Spending limits install the
audited spending-limit policy contract on a token-scoped rule; over-limit payments are
rejected **on-chain**. Enforcement covers transfers built as direct token invocations -
which is how this library sends payments. (`smart-account-kit@0.4.2`'s own `kit.transfer()`
wraps transfers in `execute` and is not covered until the kit's next release.)

## Components

| Component | Purpose |
| --- | --- |
| `<PasskeyWalletProvider config kit?>` | Creates and shares the smart-account-kit instance; runs silent session restore (`autoConnect`), capability detection, and event-driven state sync. |
| `<CreateWalletButton />` | Passkey registration → contract deployment → (testnet) funding, with per-phase progress labels. Props: `userName`, `nickname`, `fund`, `label`, `unstyled`, `onSuccess`, `onError`. |
| `<ConnectWalletButton />` | Session restore / passkey prompt; renders an account chip with copy / explorer / switch / disconnect menu when connected. |
| `<WalletBalance />` | Live balance with skeleton, error state, auto + manual refresh. Props: `token`, `address`, `refreshInterval`, `showRefresh`, `unstyled`. |
| `<SignTransactionModal />` | Accessible approval dialog (focus trap, Escape, `aria-modal`) driving `signAndSubmit`. Props: `open`, `transaction`, `title`, `description`, `signOptions`, `onClose`, `onSuccess`, `onError`, `unstyled`. |
| `<SignerList />` | The account's signers across its authorization rules: type badges, nicknames, "this device" tag, two-step removal with a last-signer lockout guard. Props: `readOnly`, `onRemoved`, `onError`, `unstyled`. |
| `<AddSignerButton />` | Add a new passkey (two prompts: register, then approve), an Ed25519 recovery key, or a delegated Stellar address - each on its own single-signer rule. Props: `method`, `label`, `variant`, `size`, `onAdded`, `onError`, `unstyled`. |
| `<RecoverySetup />` | Guided recovery: enroll a backup credential (`mode="setup"`, shows the wallet address to save), or reconnect on a fresh device (`mode="recover"`: passkey → discovery → manual-address fallback). Props: `mode`, `onEnrolled`, `onRecovered`, `onError`, `unstyled`. |
| `<SpendingPolicyForm />` | Read + manage the on-chain spending limit for a token: limit/window inputs, spent-remaining meter, update and guarded remove. Props: `token`, `tokenSymbol`, `onChanged`, `onError`, `unstyled`. |

All components take `className` and `unstyled` - with `unstyled` they render bare, semantic
markup for your own styles.

## Hooks (headless layer)

| Hook | Returns |
| --- | --- |
| `usePasskeyWallet()` | `{ kit, status, address, credentialId, isConnected, error, capabilities, config, connect, createWallet, disconnect, fund }` |
| `useCreateWallet()` | `{ createWallet, status, phase, error, result, reset }` - `phase`: `"passkey" \| "deploying" \| "funding"` |
| `useConnectWallet()` | `{ connect, status, error, reset }` |
| `useSignTransaction()` | `{ sign, signAndSubmit, status, error, result, reset }` - status: `signing → submitting → success` |
| `useTransfer()` | `{ transfer({ to, amount, token? }), status, error, result, reset }` with address/amount validation |
| `useWalletBalance(opts?)` | `{ raw, formatted, symbol, decimals, status, error, refetch, isRefreshing }` - auto-refetch after every submitted tx |
| `useWalletAddress()` | `{ address, displayAddress, explorerUrl, copy, copied }` |
| `useSigners()` | `{ signers, rules, activeRuleId, isLoading, error, refresh }` - display-ready signer list, auto-refreshes after every tx |
| `useAddSigner()` | `{ addPasskey, addEd25519, addWallet, status, error, reset }` - each creates the signer's own rule |
| `useRemoveSigner()` | `{ removeSigner(target), status, error, reset }` - refuses to remove the final signer (`last_signer`) |
| `useRecovery()` | `{ enroll, recover, walletAddress, status, error, reset }` - `recover` resolves the wallet via local map → indexer → manual address (`recovery_needs_address`) |
| `useSpendingPolicy(token?)` | `{ policy, setLimit, removeLimit, isLoading, status, error, refresh, reset }` - stroop-precise `{ limit, spent, remaining, periodLedgers }` |

Utilities: `buildTransferTransaction`, `buildContractCallTransaction`, `summarizeTransaction`,
`detectWebAuthnCapabilities`, `toSembolError`, `formatTokenAmount`, `parseTokenAmount`,
`truncateAddress`, `explorerUrl`. Storage adapters and `SmartAccountKit` are re-exported for
advanced use.

## Configuration

```ts
interface SembolConfig {
  rpcUrl: string;                     // required
  networkPassphrase: string;          // required
  accountWasmHash: string;            // required - smart-account WASM on your network
  webauthnVerifierAddress: string;    // required - deployed secp256r1 verifier
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
keypair as fee source - perfect for testnet, not for mainnet. For production, run an
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
in the config (this is how the library's own 102-test suite works - see `tests/helpers/fakeKit.ts`
in the repo). For E2E, Chromium's virtual-authenticator CDP works with real testnet flows.

## License

MIT
