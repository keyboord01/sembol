# Interoperability: where Sembol fits in Stellar's passkey tooling

September 2026. A short note for teams choosing passkey tooling on Stellar, and for the maintainers
of the projects named here.

Stellar now has several passkey efforts, including SCF-funded work from the Q2 2026 Passkey UI
RFP. That is good for the ecosystem, and it raises a fair question: do these compete, or fit
together? For Sembol the answer is that it is built to sit **on shared standards**, so a team is
never locked into it and nothing it creates is Sembol-specific.

## What Sembol builds on, and does not replace

| Layer | What Sembol uses | Why it matters for interop |
| --- | --- | --- |
| Contracts | The **audited OpenZeppelin Stellar smart-account contracts** already on mainnet | Sembol deploys no contracts. A Sembol wallet is a standard OZ smart account that any OZ-compatible tool can read, sign for, and manage. |
| Client SDK | The official **`stellar/smart-account-kit`** | Sembol wraps it and exposes the instance (`usePasskeyWallet().kit`), so anything the kit can do stays reachable without leaving Sembol. We contribute fixes upstream ([smart-account-kit#4](https://github.com/stellar/smart-account-kit/pull/4)). |
| External wallets | **Stellar Wallets Kit**, through the kit's `StellarWalletsKitAdapter` | Freighter, xBull, Lobstr and others can be added as co-signers on a passkey wallet today. See the [integration guide](stellar-wallets-kit-integration.md). |
| Fee sponsorship | The **smart-account-kit relayer protocol** (`{ func, auth[] }` or `{ xdr }`) | Sembol Cloud speaks the same protocol as the OpenZeppelin Relayer, so the relayer URL is swappable in either direction, and Sembol Cloud can itself forward to a self-hosted OZ Relayer. |

## How it sits next to the Passkey UI work

The Passkey UI RFP asked for passkey usage patterns, a minimal composable SDK and reference UI
components, aimed at adoption into Stellar Wallets Kit. Sembol does not bid for that slot, and does
not propose to own a passkey module in Stellar Wallets Kit.

Sembol's focus is the layer apps hit next, once a passkey works:

- **Fees.** Since smart-account-kit 0.5.0 a wallet cannot be created without a fee relayer, and
  there is no self-serve relayer on mainnet. Sembol Cloud is a hosted, per-project, budget-capped
  sponsor, [proven on mainnet](../README.md#mainnet-september-2026).
- **A drop-in React wallet.** Components and hooks for create, connect, send, signers, recovery and
  spending limits, themed through one typed prop.
- **An application proving it.** [Kumbara](https://kumbara.sembol.xyz), a savings app on testnet
  with a SEP anchor deposit and withdrawal and a DeFindex vault.

Where the projects overlap, the shared standards mean they can be mixed rather than chosen between:

- A wallet created with Sembol is an OZ smart account, so it works with any OZ-based tooling,
  including other client libraries built on the same contracts.
- Any app built on smart-account-kit can point its relayer URL at Sembol Cloud, whichever UI
  library it uses.
- If a passkey module lands in Stellar Wallets Kit, Sembol apps get it through the same kit
  integration they already use.

## What we would like to agree on in public

We have opened a discussion with the Stellar Wallets Kit maintainers on these points:

1. **How a smart account (`C…` address) should appear to a dapp** through the kit's SEP-43
   interface, so dapps do not assume a `G…` address.
2. **Which relayer protocol dapps should expect**, so a passkey wallet from any library can have
   its fees sponsored by any relayer.
3. **A shared test fixture**: one OZ smart account on testnet that every passkey library can use to
   check compatibility.

Link: _added when the discussion is opened._

## Summary

- **Contracts:** OpenZeppelin's, audited, not ours.
- **SDK:** the official `smart-account-kit`, which we contribute to.
- **External wallets:** Stellar Wallets Kit, through the kit's adapter.
- **Fees:** the standard relayer protocol, and Sembol Cloud is one relayer among many.

Choosing Sembol does not lock a team out of the rest of the ecosystem, and choosing something else
does not lock it out of Sembol Cloud.
