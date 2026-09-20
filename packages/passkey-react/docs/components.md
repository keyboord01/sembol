# Components

Prebuilt, themeable React components: provider, create, connect, balance, signing modal, signers, recovery, spending limits.

Every component ships styled by the default stylesheet, themeable through the [theme prop](https://sembol.xyz/docs/theming), and escapable via `unstyled`. See each one live, in every state, in the [Storybook](https://storybook.sembol.xyz).

## PasskeyWalletProvider

The root. Builds the smart-account-kit instance, restores sessions, exposes everything to hooks, and applies your `theme`.

```tsx
<PasskeyWalletProvider config={config} theme={{ accent: "#0284c7" }}>
  {children}
</PasskeyWalletProvider>
```

## CreateWalletButton

The full creation ceremony behind one button: passkey registration, sponsored contract deployment, optional funding. Props: `label`, `nickname`, `fund`, `variant`, `size`, `unstyled`, `onCreated`, `onError`.

## ConnectWalletButton

Connects or restores a wallet. Once connected it becomes an account chip with a menu: copy address, view on stellar.expert, switch wallet, disconnect. Props: `label`, `variant`, `size`, `unstyled`, `onConnected`, `onDisconnected`, `onError`.

## WalletBalance

Live XLM balance with an optional refresh control and polling. Props: `pollInterval`, `showRefresh`, `unstyled`.

## SignTransactionModal

Reviews and signs any `AssembledTransaction` with the passkey: human-readable summary, fee, network, then Face ID. Drive it with state:

```tsx
const [tx, setTx] = useState<AssembledTransaction<unknown> | null>(null);

<SignTransactionModal
  open={tx !== null}
  transaction={tx}
  title="Approve payment"
  onClose={() => setTx(null)}
  onSuccess={({ hash }) => console.log(hash)}
/>
```

## Security components

| Component | What it does |
| --- | --- |
| `SignerList` | Every signer on the account, with guarded removal |
| `AddSignerButton` | Add a backup passkey or an Ed25519 public key as a signer |
| `RecoverySetup` | Enroll recovery credentials, or run recovery on a new device (`mode="recover"`) |
| `SpendingPolicyForm` | Set an on-chain spending limit per time window |
