# Hooks

Headless typed hooks: wallet state, creation, connection, balance, transfers, signing, signers, recovery, spending policy.

Everything the components do is available headless. All hooks require a `PasskeyWalletProvider` above them.

## usePasskeyWallet

```ts
const {
  kit,          // the smart-account-kit instance
  status,       // "initializing" | "disconnected" | "connected" ...
  isConnected,
  address,      // C... contract address
  capabilities, // WebAuthn support detection
  config,       // resolved config incl. explorerBaseUrl
  connect, createWallet, disconnect, fund,
} = usePasskeyWallet();
```

## Flows

| Hook | Returns |
| --- | --- |
| `useCreateWallet()` | `createWallet` with per-phase progress: `passkey`, `deploying`, `funding` |
| `useConnectWallet()` | `connect` with status |
| `useTransfer()` | `transfer({ to, amount })` building, signing, and submitting an XLM payment |
| `useSignTransaction()` | sign any `AssembledTransaction` with the passkey |
| `useRecovery()` | enroll and execute recovery |

## State

| Hook | Returns |
| --- | --- |
| `useWalletBalance()` | `formatted`, `raw` stroops, `symbol`, `status`, `refetch`, `isRefreshing` |
| `useWalletAddress()` | `address`, `copy()` with `copied` feedback, `explorerUrl` |
| `useSigners()` | the signer list, live |
| `useAddSigner()` / `useRemoveSigner()` | signer mutations |
| `useSpendingPolicy()` | read and set the on-chain limit |

## Utilities

```ts
import { buildTransferTransaction, toSembolError } from "@sembol/passkey-react";

// arbitrary token transfers (returns an AssembledTransaction for the modal)
const tx = await buildTransferTransaction(kit, {
  tokenContract: config.nativeTokenContract,
  to, amount,
});

// every thrown error normalizes to a typed SembolError
try { ... } catch (e) {
  toast(toSembolError(e).userMessage);
}
```
