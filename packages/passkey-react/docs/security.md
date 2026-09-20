# Signers & recovery

On-chain security: backup signers, recovery credentials, spending limits enforced by the smart account contract.

A Sembol wallet is a contract, so security is on-chain and survives Sembol itself: extra signers, recovery, and spending caps are enforced by the smart account, not by an API someone could turn off.

## Backup signers

Add a second passkey (another device) or an Ed25519 public key whose secret lives offline. `SignerList` + `AddSignerButton` cover the UI; `useSigners`, `useAddSigner`, `useRemoveSigner` are the headless path. The last signer cannot lock itself out through the UI.

## Recovery

Enroll a recovery credential while the device is still in hand (`RecoverySetup`). To get back in later: open the app on any device and run `RecoverySetup mode="recover"`, which is exactly what the [demo wallet's create page](https://sembol.xyz/wallet) does under "Lost your device?".

## Spending limits

`SpendingPolicyForm` installs an on-chain policy capping XLM out per time window. Payments beyond the cap are rejected by the contract during auth, not by client code. Changing the window re-installs the policy and asks for two approvals.

> **Warning:** Enroll recovery **before** you need it. A passkey that only ever lived on one lost, unsynced device is gone; a recovery credential or second signer is the way back in.
