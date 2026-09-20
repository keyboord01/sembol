# Troubleshooting

Passkeys per domain, iCloud passkeys in Chrome, relayer errors, Buffer polyfill, domain moves.

| Symptom | Cause and fix |
| --- | --- |
| Connect finds no passkey | Passkeys are per domain. Create one on this domain first |
| Chrome cannot see iCloud passkeys | Enable "Use passkeys and passwords from iCloud Keychain" in `chrome://password-manager/settings`, or use Safari |
| Wallet creation fails instantly | A relayer is required since smart-account-kit 0.5.0. The testnet preset includes one; set `relayerUrl` for your own |
| `readBigInt64BE is not a function` | Old Next.js Buffer polyfill. Fixed automatically by this library since 0.3.1 |
| Wallets missing after a domain move | Same per-domain rule: wallets follow the domain that created them |
| Balance shows unavailable | Testnet RPC hiccup. `refetch` from `useWalletBalance`, and check the RPC URL |

## Still stuck

[Open an issue](https://github.com/keyboord01/sembol/issues) with the `SembolError` code from `toSembolError(err).code`, or read the source, it is small on purpose.

## For AI agents

These docs are machine-readable: [/llms.txt](https://sembol.xyz/llms.txt) indexes every page, [/llms-full.txt](https://sembol.xyz/llms-full.txt) is the whole documentation as one Markdown file, and every page is served as raw Markdown under `/md/docs/<slug>`.
