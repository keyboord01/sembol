# Migrating from passkey-kit (and Launchtube)

If your team built on [`passkey-kit`](https://github.com/kalepail/passkey-kit) - the original
Stellar passkey SDK - here is what changed in the ecosystem and how to move to
`@sembol/passkey-react` (or raw `smart-account-kit`) with minimal churn.

## Why migrate at all?

As of 2026:

- **passkey-kit is officially legacy.** Its README points new projects at
  [`smart-account-kit`](https://github.com/stellar/smart-account-kit), which is built on the
  **audited** OpenZeppelin smart-account contracts (passkey-kit's contracts were explicitly
  "demo material only, not audited"), and adds session persistence, an indexer, context rules,
  and policy support.
- **Launchtube is gone.** `launchtube.xyz` / `testnet.launchtube.xyz` no longer resolve; the
  service was superseded by the **OpenZeppelin Relayer Channels** service. Testnet keys are
  self-serve: `curl https://channels.openzeppelin.com/testnet/gen` → `{"apiKey":"…"}`.
- passkey-kit's Mercury-based reverse lookup (`server.getContractId({ keyId })`) is replaced by
  a public **indexer** with a built-in testnet default - no Mercury account needed.
- passkey-kit shipped raw TypeScript (you had to configure `transpilePackages`);
  smart-account-kit ships compiled ESM + types.

## Concept map

| passkey-kit | smart-account-kit / Sembol |
| --- | --- |
| `new PasskeyKit({ rpcUrl, networkPassphrase, walletWasmHash })` | `new SmartAccountKit({ rpcUrl, networkPassphrase, accountWasmHash, webauthnVerifierAddress })` - or just `<PasskeyWalletProvider config={…}>` |
| `account.createWallet(app, user)` → `{ keyId, contractId, signedTx }` then **you** submit via server | `kit.createWallet(app, user, { autoSubmit: true })` - or `useCreateWallet().createWallet()`; submission + (testnet) funding built in |
| `account.connectWallet({ keyId, getContractId })` + localStorage you wrote yourself | `kit.connectWallet()` - sessions persist in IndexedDB automatically; `connectWallet({ prompt: true })` / `{ fresh: true }` for explicit flows. Provider does silent restore on mount. |
| `account.sign(tx, { keyId })` then `server.send(tx)` | `kit.signAndSubmit(tx)` (signs auth entries, **re-simulates** - required because WebAuthn signatures inflate resources - then submits) - or `useSignTransaction()` / `<SignTransactionModal />` |
| `new PasskeyServer({ relayerUrl, relayerApiKey, mercury… })` on your backend | Optional. RPC submission works out of the box (deployer keypair pays fees on testnet). For sponsoring: `relayerUrl` → your OZ Relayer proxy (reference app ships one at `/api/relayer`). |
| `server.getContractId({ keyId })` via Mercury | `kit.discoverContractsByCredential(credentialId)` via the public indexer (testnet default built in) |
| `SACClient` for token calls | `kit.transfer(token, to, amount)` / Sembol's `useTransfer`, `buildTransferTransaction`, `useWalletBalance` |
| `SignerStore.Temporary`, `addSecp256r1/Ed25519/Policy` | `kit.signers.*`, `kit.rules.*`, `kit.policies.*` (context rules replace the flat signer list) |

## Breaking differences to plan for

1. **New contracts.** Smart accounts use the OpenZeppelin wasm (`accountWasmHash`) plus a
   deployed WebAuthn verifier contract. **Old passkey-kit wallets are different contracts** -
   they keep working against the old wasm, but new wallets deploy on the new stack. There is no
   in-place upgrade; treat it as a new wallet generation (the old keyId/passkey itself can be
   re-registered as a signer on a new smart account if you need continuity).
2. **`keyId` → `credentialId`**, still base64url; stored `StoredCredential` objects also carry
   the public key, transports, and deployment status.
3. **Signing requires re-simulation.** If you hand-rolled `account.sign` → `server.send`,
   switch to `signAndSubmit` (or replicate: sign entries → re-simulate → assemble → submit).
4. **Fee payer.** Launchtube's channel accounts are now either (a) the kit's deterministic
   deployer keypair via plain RPC - fine on testnet - or (b) OpenZeppelin Relayer channels for
   production sponsoring.

## Launchtube → OpenZeppelin Relayer, concretely

```ts
// Before (passkey-kit ≤0.11):
const server = new PasskeyServer({
  launchtubeUrl: "https://testnet.launchtube.xyz",   // ☠️ domain no longer exists
  launchtubeJwt: process.env.LAUNCHTUBE_JWT,
});
await server.send(signedTx);

// After - server-side, raw client:
import { ChannelsClient } from "@openzeppelin/relayer-plugin-channels";
const channels = new ChannelsClient({
  baseUrl: "https://channels.openzeppelin.com/testnet",
  apiKey: process.env.CHANNELS_API_KEY,               // curl …/testnet/gen
});
await channels.submitTransaction({ xdr: signedTx });

// After - with Sembol: no server code at all. Optionally set
// config.relayerUrl to a proxy route that adds the API key server-side.
```

## The React layer you no longer write

passkey-kit gave you the SDK; the React state machines, error mapping, session UX, and approval
UI were yours to build. That's the part `@sembol/passkey-react` replaces:

```tsx
<PasskeyWalletProvider config={config}>
  <ConnectWalletButton />          {/* session restore + prompt + account chip */}
  <CreateWalletButton />           {/* passkey → deploy → fund, with progress */}
  <WalletBalance />                {/* auto-refreshing balance */}
  {/* useSignTransaction / SignTransactionModal for approvals */}
</PasskeyWalletProvider>
```

WebAuthn's sharp edges (`NotAllowedError` ambiguity, `InvalidStateError` duplicate credentials,
rpId mismatches, capability detection across browsers) arrive as one typed `SembolError` with a
user-presentable message - see the Storybook *Browser Compatibility* page.
