# Headless & advanced

unstyled components, injectable WebAuthn and storage adapters, kit injection, React Native readiness.

## unstyled

Every component accepts `unstyled` to drop all `sembol-*` classes and render bare, accessible markup for your own CSS. Or skip the stylesheet entirely and compose the hooks.

## Injectable adapters

The provider accepts injectable `webAuthn` functions (`startRegistration`, `startAuthentication`) and a `storage` adapter. These are the seams that make non-browser targets possible; React Native support is on the roadmap on exactly these hooks.

## Kit injection

```tsx
// tests and advanced setups: bring your own kit
<PasskeyWalletProvider config={config} kit={myPrebuiltKit}>
```

## Errors

All failures normalize to `SembolError` with a stable `code` and a human `userMessage`. `contractCodeFromMessage` maps raw Soroban errors when you need to go deeper.

## Bundlers

Next.js (webpack and Turbopack) and Vite are both exercised: the library patches Next's Buffer polyfill gap automatically and stays inert under Vite, where it is not needed.
