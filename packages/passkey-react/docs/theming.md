# Theming

One typed theme prop restyles every component: accent derivation, 19 tokens per scheme, radius, fonts, presets, scoped themes, CSS variables.

Sembol should look like **your** product. One typed prop does it, and everything compiles down to CSS custom properties you can also set by hand.

```tsx
<PasskeyWalletProvider
  config={config}
  theme={{ accent: "#e11d48", radius: "lg", colorScheme: "auto" }}
>
```

> Build a theme visually in the [theme builder](https://sembol.xyz/customize): live components, every control typed, and the exact prop generated for copy-paste.

## The SembolTheme object

| Option | Values |
| --- | --- |
| `accent` | Any CSS color. Hover, active, muted, and the focus ring derive from it per scheme via `color-mix()` |
| `colors` | Fine-grained overrides, 19 tokens: `bg`, `surface`, `surfaceHover`, `border`, `borderStrong`, `fg`, `fgMuted`, `onAccent`, `success*`, `danger*`, `overlay`, and the accent family |
| `darkColors` | Dark-scheme overrides, layered on top of `colors` |
| `radius` | `"none" | "sm" | "md" | "lg" | "full"` or a number in px |
| `fonts` | `{ body, mono }` CSS stacks |
| `shadows` | `false` for a flat UI |
| `colorScheme` | `"light" | "dark" | "auto"`; the provider manages `data-sembol-theme` for you |

## Presets

```tsx
import { sembolThemes } from "@sembol/passkey-react";

<PasskeyWalletProvider theme={sembolThemes.seal} ... >     // gold on ink
<PasskeyWalletProvider theme={{ ...sembolThemes.ocean, radius: "full" }} ... >
```

Four ship today: `seal`, `ocean`, `forest`, `mono`. See them side by side in [Storybook: Theming/Presets](https://storybook.sembol.xyz).

## Scoped themes

```ts
import { sembolThemeToCss } from "@sembol/passkey-react";

// theme only one subtree, e.g. an embedded checkout
const css = sembolThemeToCss({ accent: "#16a34a" }, ".checkout");
```

## Plain CSS

Every visual decision is a `--sembol-*` custom property. Override them after the stylesheet import and skip the prop entirely; dark mode is the `data-sembol-theme="dark"` attribute, or the OS preference when the attribute is absent.

```css
:root {
  --sembol-color-accent: #e11d48;
  --sembol-radius: 6px;
  --sembol-font: "Inter", sans-serif;
}
```
