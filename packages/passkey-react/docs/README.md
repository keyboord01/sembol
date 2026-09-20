# Sembol documentation

`@sembol/passkey-react` — React components and headless hooks that turn a passkey
into a self-custodial Stellar smart account (an audited OpenZeppelin smart-account
contract), with transaction fees sponsored so a new user needs no XLM.

These files ship inside the package so an assistant working in a project that has
Sembol installed can read them directly from `node_modules/@sembol/passkey-react/docs/`,
without a network call. They are generated from the same source as https://sembol.xyz/docs.

| Task | File |
| --- | --- |
| Sembol is an open-source React library where Face ID becomes a self-custodial Stellar smart account. No seed phrases, no extensions. | [introduction.md](introduction.md) |
| Install @sembol/passkey-react and ship a working Stellar passkey wallet in one component. | [quickstart.md](quickstart.md) |
| SembolConfig fields, the testnet preset, relayer requirements, and environment overrides. | [configuration.md](configuration.md) |
| Prebuilt, themeable React components: provider, create, connect, balance, signing modal, signers, recovery, spending limits. | [components.md](components.md) |
| Headless typed hooks: wallet state, creation, connection, balance, transfers, signing, signers, recovery, spending policy. | [hooks.md](hooks.md) |
| One typed theme prop restyles every component: accent derivation, 19 tokens per scheme, radius, fonts, presets, scoped themes, CSS variables. | [theming.md](theming.md) |
| On-chain security: backup signers, recovery credentials, spending limits enforced by the smart account contract. | [security.md](security.md) |
| unstyled components, injectable WebAuthn and storage adapters, kit injection, React Native readiness. | [headless.md](headless.md) |
| Passkeys per domain, iCloud passkeys in Chrome, relayer errors, Buffer polyfill, domain moves. | [troubleshooting.md](troubleshooting.md) |

## Canonical links

- Docs site: https://sembol.xyz/docs
- Machine-readable index: https://sembol.xyz/llms.txt
- Everything in one file: https://sembol.xyz/llms-full.txt
- Source (MIT): https://github.com/keyboord01/sembol
