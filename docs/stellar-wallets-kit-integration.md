# Integrating Sembol with Stellar Wallets Kit

This guide is for teams using [Stellar Wallets Kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit)
(`@creit.tech/stellar-wallets-kit`) who want passkey smart wallets alongside Freighter, xBull,
Lobstr & co — and it documents the intended path for adopting Sembol's engine **into** the kit
as a first-party module.

> Status as of July 2026: Stellar Wallets Kit v2.5.0 has **no passkey module** — v2.0 was a
> breaking rewrite (static `StellarWalletsKit.init({ modules })` singleton, SEP-43-shaped
> signing), and its module registry only covers extension/hardware/bridge wallets. That is the
> adoption gap this document targets. The actual PR into the kit is a separate workstream; this
> guide is the technical basis for that conversation.

## How the two kits relate

| | Stellar Wallets Kit | Sembol / smart-account-kit |
| --- | --- | --- |
| Wallet identity | External wallet's G-address | On-chain smart account (C-address contract) |
| Signing | Delegates to extension/hardware wallet | WebAuthn passkey signs Soroban auth entries |
| Session | Selected wallet id | Credential + contract persisted (IndexedDB) |
| Tx shape | Classic + Soroban envelopes (XDR in/out) | Soroban `AssembledTransaction` / auth entries |

Two integration directions exist, and they're complementary:

## Direction 1 (available today): external wallets *inside* Sembol

smart-account-kit already consumes Stellar Wallets Kit for **multi-signer flows**: an external
wallet (Freighter, Ledger…) can be a delegated Ed25519 signer on the smart account. Wire it via
the provider config:

```ts
import { StellarWalletsKitAdapter } from "smart-account-kit";

<PasskeyWalletProvider
  config={{
    ...networkConfig,
    // ExternalWalletAdapter — smart-account-kit ships a ready adapter for SWK
  }}
/>
```

See `StellarWalletsKitAdapter` in smart-account-kit for the wiring; Sembol re-exposes the kit
instance (`usePasskeyWallet().kit`) so `kit.externalSigners.addFromWallet()` works unchanged.

## Direction 2 (the adoption path): a passkey module *inside* Stellar Wallets Kit

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
    // optional signAndSubmitTransaction() member — see Open questions.
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
   (already in `ModuleInterface` for WalletConnect-style wallets — returns
   `{ status: "success" | "pending" }`), or (b) the kit grows an explicit smart-wallet signing
   capability. Option (a) works today and is what we propose.
2. **C-addresses.** `getAddress()` returns a contract address; consuming dapps must not assume
   `G…`. The kit itself is agnostic, but downstream SDK calls (e.g. sequence-number lookups)
   are not.
3. **Availability timing.** `isAvailable()` must answer in <1s — our capability detection is
   a few ms (no network), so passkeys can even sit in `defaultModules()` (no polyfills needed).
4. **Fee sponsoring.** Smart-account submissions need a fee payer (RPC deployer account on
   testnet, OpenZeppelin Relayer in production) — configuration the kit modal doesn't model
   today; it stays in the module constructor.

## Try it

Everything above runs against the live testnet in this repo's Storybook and reference app —
`pnpm storybook` / `pnpm demo`.
