# Integrating Sembol with Stellar Wallets Kit

This guide is for teams using [Stellar Wallets Kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit)
(`@creit.tech/stellar-wallets-kit`) who want passkey smart wallets alongside Freighter, xBull,
Lobstr & co - and it documents the intended path for adopting Sembol's engine **into** the kit
as a first-party module.

> Status as of July 2026: Stellar Wallets Kit v2.5.0 has **no passkey module** - v2.0 was a
> breaking rewrite (static `StellarWalletsKit.init({ modules })` singleton, SEP-43-shaped
> signing), and its module registry only covers extension/hardware/bridge wallets. That is the
> adoption gap this document targets. The actual PR into the kit is a separate workstream; this
> guide is the technical basis for that conversation.
>
> Update, August 2026: the other integration direction is no longer a sketch. smart-account-kit
> 0.4.x ships a **built-in `StellarWalletsKitAdapter`**, so external wallets (Freighter, xBull,
> Lobstr…) can sign as delegated co-signers on a passkey smart account today - see Direction 1
> below, now updated to the shipped API. A proposal for the reverse direction (a passkey module
> inside the kit) is being filed upstream on
> [Creit-Tech/stellar-wallets-kit](https://github.com/Creit-Tech/stellar-wallets-kit/issues).

## How the two kits relate

| | Stellar Wallets Kit | Sembol / smart-account-kit |
| --- | --- | --- |
| Wallet identity | External wallet's G-address | On-chain smart account (C-address contract) |
| Signing | Delegates to extension/hardware wallet | WebAuthn passkey signs Soroban auth entries |
| Session | Selected wallet id | Credential + contract persisted (IndexedDB) |
| Tx shape | Classic + Soroban envelopes (XDR in/out) | Soroban `AssembledTransaction` / auth entries |

Two integration directions exist, and they're complementary:

## Direction 1 (shipped in smart-account-kit 0.4.x): external wallets *inside* Sembol

smart-account-kit 0.4.x ships `StellarWalletsKitAdapter` in the box: a concrete
`ExternalWalletAdapter` that drives Stellar Wallets Kit (its modal, wallet selection, and
SEP-43 signing) so an external wallet can act as a **delegated co-signer** on the smart
account. Two halves make that work:

- **On-chain registration** - Sembol's `useAddSigner().addWallet("G…")` (or
  `<AddSignerButton method="wallet" />`) adds the external wallet's G-address as a delegated
  signer on its own rule.
- **Signature collection** - when that co-signer needs to sign an auth entry, the kit routes
  the request through the adapter, which asks the connected extension wallet to sign.

Wiring: the adapter is passed as `externalWallet` when constructing the kit. Sembol's
`SembolConfig` does not expose that field, so build the `SmartAccountKit` yourself and hand it
to the provider via its `kit` prop (the provider then uses it as-is):

```tsx
import { SmartAccountKit, StellarWalletsKitAdapter } from "smart-account-kit";
import { Networks } from "@stellar/stellar-sdk";
import { PasskeyWalletProvider, SEMBOL_TESTNET_ARTIFACTS } from "@sembol/passkey-react";

const config = { ...SEMBOL_TESTNET_ARTIFACTS, appName: "My App" };

const adapter = new StellarWalletsKitAdapter({ network: Networks.TESTNET });
await adapter.init(); // imports SWK, registers its SEP-43 wallet modules

const kit = new SmartAccountKit({
  rpcUrl: config.rpcUrl,
  networkPassphrase: config.networkPassphrase,
  accountWasmHash: config.accountWasmHash,
  webauthnVerifierAddress: config.webauthnVerifierAddress,
  ed25519VerifierAddress: config.ed25519VerifierAddress,
  externalWallet: adapter,
});

<PasskeyWalletProvider config={config} kit={kit}>…</PasskeyWalletProvider>;
```

Requirements and behavior, per the 0.4.2 typings:

- Stellar Wallets Kit is an **optional peer dependency**, loaded lazily inside
  `adapter.init()` (throws if not installed). Nothing SWK-related loads unless you use the
  adapter.
- **Upstream packaging bug + workaround (verified against npm, Aug 2026):** smart-account-kit
  0.4.2 declares and dynamically imports `@creit-tech/stellar-wallets-kit` (hyphen), but the
  published package is `@creit.tech/stellar-wallets-kit` (dot, 2.5.0 at time of writing) -
  the hyphenated name does not exist on npm, so the adapter's import fails out of the box.
  Until it is fixed upstream, alias the name so the kit's import resolves:

  ```jsonc
  // package.json
  "dependencies": {
    "@creit-tech/stellar-wallets-kit": "npm:@creit.tech/stellar-wallets-kit@^2.5.0"
  }
  ```

  (We are reporting this upstream to
  [stellar/smart-account-kit](https://github.com/stellar/smart-account-kit/issues).)
- `adapter.connect()` opens the kit's own wallet-picker modal and resolves to the connected
  wallet (or `null` on cancel); `adapter.reconnect(walletId)` is a best-effort silent restore
  for page reloads. Connections can persist via the kit's `externalSignerStorage` and
  `kit.externalSigners.restoreConnections()`.
- Sembol re-exposes the kit instance (`usePasskeyWallet().kit`), so
  `kit.externalSigners.addFromWallet()` - connect an external wallet and track it as an
  available signer - and `kit.externalSigners.canSignFor("G…")` work unchanged from React.

The result: a passkey wallet where a Freighter or xBull account is a registered backup signer,
without Sembol depending on SWK for its core flows.

## Direction 2 (the adoption path): a passkey module *inside* Stellar Wallets Kit

Direction 1 helps apps that already chose Sembol. A first-class module in Stellar Wallets Kit
would help the larger group that chose SWK: passkey smart wallets would appear in the kit's
wallet-picker modal **next to** Freighter, xBull, and Lobstr, so any SWK dapp gains
"sign in with a passkey - no extension installed" through the integration it already ships,
with zero Sembol-specific wiring. It also completes a neat loop with Direction 1: the same
pair of libraries would compose in both directions (external wallets as co-signers on smart
accounts, and smart accounts as a wallet option in the kit).

A kit module must implement `ModuleInterface` (from `@creit.tech/stellar-wallets-kit/types`,
v2.x). Sembol's engine maps onto it almost 1:1. Skeleton:

```ts
import { ModuleType, type ModuleInterface } from "@creit.tech/stellar-wallets-kit/types";
import { SmartAccountKit, detectWebAuthnCapabilities } from "@sembol/passkey-react";

export const PASSKEY_ID = "sembol-passkey";

export class SembolPasskeyModule implements ModuleInterface {
  moduleType = ModuleType.HOT_WALLET;
  productId = PASSKEY_ID;
  productName = "Passkey Smart Wallet";
  productUrl = "https://github.com/keyboord01/sembol";
  productIcon = "data:image/svg+xml;…";

  constructor(private kit: SmartAccountKit) {}

  // Must resolve < 1000ms or the kit's modal lists the wallet as unavailable.
  async isAvailable(): Promise<boolean> {
    const caps = await detectWebAuthnCapabilities();
    return caps.supported;
  }

  async getAddress(): Promise<{ address: string }> {
    // Silent session restore first; prompt if nothing stored.
    const restored = await this.kit.connectWallet();
    const session = restored ?? (await this.kit.connectWallet({ prompt: true }));
    if (!session) throw { code: -1, message: "No passkey wallet found" };
    return { address: session.contractId }; // C-address (smart account)
  }

  async signTransaction(
    xdr: string,
    opts?: { networkPassphrase?: string },
  ): Promise<{ signedTxXdr: string; signerAddress?: string }> {
    // Passkeys sign Soroban *auth entries*, then the tx must be re-simulated
    // (WebAuthn signatures are larger than simulation placeholders).
    // Sembol/smart-account-kit encapsulate that as sign-and-submit; a pure
    // "sign and return XDR" flow needs the auth-entry route below, or the kit's
    // optional signAndSubmitTransaction() member - see Open questions.
    throw { code: -2, message: "Use signAuthEntry / signAndSubmitTransaction for smart accounts" };
  }

  async signAuthEntry(
    authEntry: string,
    opts?: { networkPassphrase?: string },
  ): Promise<{ signedAuthEntry: string; signerAddress?: string }> {
    const { xdr: xdrLib } = await import("@stellar/stellar-sdk");
    const entry = xdrLib.SorobanAuthorizationEntry.fromXDR(authEntry, "base64");
    const signed = await this.kit.signAuthEntry(entry);
    return {
      signedAuthEntry: signed.toXDR("base64"),
      signerAddress: this.kit.contractId,
    };
  }

  async signMessage(): Promise<{ signedMessage: string; signerAddress?: string }> {
    throw { code: -2, message: "Message signing is not defined for smart accounts yet" };
  }

  async getNetwork(): Promise<{ network: string; networkPassphrase: string }> {
    return { network: "TESTNET", networkPassphrase: this.kit.networkPassphrase };
  }

  async disconnect(): Promise<void> {
    await this.kit.disconnect();
  }
}
```

Registration is plain v2.x:

```ts
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";

StellarWalletsKit.init({
  modules: [...defaultModules(), new SembolPasskeyModule(kit)],
});
```

## Open questions for the kit maintainers (the PR conversation)

1. **`signTransaction` semantics for contract wallets.** SEP-43's "XDR in, signed XDR out"
   assumes envelope signatures. Smart accounts sign *auth entries* and require re-simulation,
   so either (a) the module implements the optional `signAndSubmitTransaction()` member
   (already in `ModuleInterface` for WalletConnect-style wallets - returns
   `{ status: "success" | "pending" }`), or (b) the kit grows an explicit smart-wallet signing
   capability. Option (a) works today and is what we propose.
2. **C-addresses.** `getAddress()` returns a contract address; consuming dapps must not assume
   `G…`. The kit itself is agnostic, but downstream SDK calls (e.g. sequence-number lookups)
   are not.
3. **Availability timing.** `isAvailable()` must answer in <1s - our capability detection is
   a few ms (no network), so passkeys can even sit in `defaultModules()` (no polyfills needed).
4. **Fee sponsoring.** Smart-account submissions need a fee payer (RPC deployer account on
   testnet, OpenZeppelin Relayer in production) - configuration the kit modal doesn't model
   today; it stays in the module constructor.

## Try it

Everything above runs against the live testnet in this repo's Storybook and reference app -
`pnpm storybook` / `pnpm demo`. The delegated-co-signer surface (adding a `G…` wallet as a
signer) is on the reference app's security page; the passkey-module proposal for the kit
maintainers is being filed on
[Creit-Tech/stellar-wallets-kit](https://github.com/Creit-Tech/stellar-wallets-kit/issues).
