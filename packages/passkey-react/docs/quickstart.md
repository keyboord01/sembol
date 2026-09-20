# Quickstart

Install @sembol/passkey-react and ship a working Stellar passkey wallet in one component.

## Install

```bash
npm install @sembol/passkey-react
```

## Wrap and render

One provider, one stylesheet import, and two components:

```tsx title="app.tsx"
import {
  PasskeyWalletProvider,
  CreateWalletButton,
  ConnectWalletButton,
  SEMBOL_TESTNET_ARTIFACTS,
} from "@sembol/passkey-react";
import "@sembol/passkey-react/styles.css";

export default function App() {
  return (
    <PasskeyWalletProvider config={SEMBOL_TESTNET_ARTIFACTS}>
      <CreateWalletButton />
      <ConnectWalletButton />
    </PasskeyWalletProvider>
  );
}
```

That is a complete testnet wallet: create with Face ID, sponsored contract deployment, automatic session restore on reload. The provider is SSR safe, so it wraps a Next.js App Router tree directly.

## Read state, send a payment

```tsx
import {
  usePasskeyWallet,
  useWalletBalance,
  useTransfer,
} from "@sembol/passkey-react";

function Wallet() {
  const { isConnected, address } = usePasskeyWallet();
  const { formatted, symbol } = useWalletBalance();
  const { transfer, status } = useTransfer();

  if (!isConnected) return null;
  return (
    <>
      <p>{address}</p>
      <p>{formatted} {symbol}</p>
      <button
        onClick={() => transfer({ to: "G...", amount: "1" })}
        disabled={status === "transferring"}
      >
        Send 1 XLM
      </button>
    </>
  );
}
```

## Make it yours

```tsx
<PasskeyWalletProvider
  config={SEMBOL_TESTNET_ARTIFACTS}
  theme={{ accent: "#e11d48", radius: "lg" }}
>
```

One `accent` retints every component. Build a full theme visually in the [theme builder](https://sembol.xyz/customize) and copy the prop out, or read [Theming](https://sembol.xyz/docs/theming) for the whole API.

> **Warning:** **Passkeys are per domain.** A wallet created on `localhost` will not appear on your production domain. Each domain gets its own passkeys, by WebAuthn design.
