# Builder feedback: synthesis (September 2026)

Anonymized. Nobody is named, and nothing here is quoted word for word.

## Who we spoke to

| Group | Count | Context |
| --- | --- | --- |
| Stellar ecosystem team members | 4 | One-to-one conversations about the project, its positioning, and the mainnet path |
| Builder teams at the Rise In × Stellar Pro hacker house and hackathon (Istanbul, Sep 16–20) | 3 | Teams that used `@sembol/passkey-react` in their hackathon projects; we supported them during the event and followed up on what they hit. Public example of a hackathon project built on it: [Orbital](https://github.com/berkay1532/B2B) |
| **Total** | **7 conversations** | The plan called for 10 short builder interviews; we held 7, weighted towards teams who actually built on Sembol |

## What we heard

### 1. The ask from builders: "make mainnet easy"

This was the strongest and most consistent point from the hackathon teams. Getting a passkey wallet
working on testnet was not the hard part, because the testnet preset works with no configuration.
The friction was the next step: **how do we ship this to mainnet?**

This matches what we know about the stack. Since smart-account-kit 0.5.0, creating a wallet needs a
fee relayer, and there is no self-serve relayer on mainnet. A team leaving a hackathon would have to
stand up and fund its own relayer before its first real user.

### 2. The ecosystem view: the approach is right

The ecosystem conversations were clearly positive. The points that landed:

- **Audited contracts, none of our own.** Building on the OpenZeppelin smart accounts, rather than
  deploying custom contracts, was seen as the right call.
- **Working with the ecosystem, not around it.** Wrapping the official `smart-account-kit` and
  sending fixes upstream, rather than forking it.
- **A real app on top.** Kumbara shows the library carrying a full deposit, save and withdraw flow,
  not only a demo button.

### 3. Smaller points from the teams

The hackathon teams also gave feedback on setup and integration details, and we implemented it
during and after the event. See the next section.

## What we changed

| Feedback | Change |
| --- | --- |
| Mainnet should not need your own relayer | Sembol Cloud: a hosted fee sponsor with a key per project, a budget capped by the funded balance, and a [mainnet proof](../README.md#mainnet-september-2026). `SEMBOL_MAINNET_ARTIFACTS` plus a relayer URL is the whole switch. |
| Building on it ourselves: our own hackathon entry, [koul](https://koul.me) (2nd place, Scale Track), needed a keeper to act on a user's behalf, within limits | Agent access: `useAgentPermission`, `<GrantAgentAccess />`, `<AgentPermissions />`. It grants an expiring, policy-gated signer to a bot or agent. Merged during the event ([#3](https://github.com/keyboord01/sembol/pull/3)). |

## What we are doing next

1. **A self-serve path to mainnet.** Today Sembol Cloud keys are issued by hand (v0 is limited to 5
   projects). Next: let a team get a mainnet project key and fund its own float without talking to
   us.
2. **A mainnet section in the docs** that walks from the testnet preset to a live mainnet app in
   one page, including how to fund a smart (`C…`) wallet, since exchanges cannot pay it directly.
3. **Follow-up with the three hackathon teams** to see whether any of them take their project to
   mainnet on Sembol Cloud. That would be the first external mainnet wallets.
