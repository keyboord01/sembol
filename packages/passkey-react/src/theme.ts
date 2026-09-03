/**
 * Zero-CSS theming.
 *
 * Everything in styles.css is driven by CSS custom properties; this module
 * lets integrators set them from typed JavaScript instead of writing CSS:
 *
 * ```tsx
 * <PasskeyWalletProvider config={config} theme={{ accent: "#e11d48", radius: "lg" }}>
 * ```
 *
 * One `accent` retints the whole kit: hover, active, muted, and the focus
 * ring derive from it per color scheme via `color-mix()`. Every derived
 * value can still be overridden explicitly through `colors` / `darkColors`,
 * and hand-written CSS on top keeps working exactly as before.
 */

export interface SembolThemeColors {
  /** Primary action color. */
  accent?: string;
  accentHover?: string;
  accentActive?: string;
  /** Tinted background behind accent-colored chips and callouts. */
  accentMuted?: string;
  /** Text/icon color on top of accent (buttons). */
  onAccent?: string;
  /** Page background behind the components. */
  bg?: string;
  /** Cards, list rows, inputs. */
  surface?: string;
  surfaceHover?: string;
  border?: string;
  borderStrong?: string;
  /** Primary text. */
  fg?: string;
  /** Secondary text. */
  fgMuted?: string;
  success?: string;
  successStrong?: string;
  successMuted?: string;
  danger?: string;
  dangerStrong?: string;
  dangerMuted?: string;
  /** Modal backdrop. */
  overlay?: string;
}

export type SembolThemeRadius = "none" | "sm" | "md" | "lg" | "full" | number;

export interface SembolTheme {
  /**
   * "light" and "dark" pin the scheme (the provider sets `data-sembol-theme`
   * for you); "auto" follows the OS preference. Omit to leave whatever the
   * host page already does untouched.
   */
  colorScheme?: "light" | "dark" | "auto";
  /**
   * The one-liner: a single brand color. Hover, active, muted, and the
   * focus ring are derived from it for both schemes.
   */
  accent?: string;
  /** Fine-grained overrides, applied to both schemes unless darkColors wins. */
  colors?: SembolThemeColors;
  /** Dark-scheme-only overrides, layered on top of `colors`. */
  darkColors?: SembolThemeColors;
  /** Corner radius scale. A number sets the base radius in px. */
  radius?: SembolThemeRadius;
  fonts?: {
    /** Body/UI font stack. */
    body?: string;
    /** Addresses, amounts, hashes. */
    mono?: string;
  };
  /** false renders everything flat (no drop shadows). */
  shadows?: boolean;
}

const RADIUS_PRESETS: Record<Exclude<SembolThemeRadius, number>, [number, number, number, number]> = {
  none: [0, 0, 0, 0],
  sm: [4, 6, 10, 999],
  md: [8, 10, 16, 999],
  lg: [12, 16, 24, 999],
  full: [16, 20, 28, 999],
};

const COLOR_VARS: Record<keyof SembolThemeColors, string> = {
  accent: "--sembol-color-accent",
  accentHover: "--sembol-color-accent-hover",
  accentActive: "--sembol-color-accent-active",
  accentMuted: "--sembol-color-accent-muted",
  onAccent: "--sembol-color-on-accent",
  bg: "--sembol-color-bg",
  surface: "--sembol-color-surface",
  surfaceHover: "--sembol-color-surface-hover",
  border: "--sembol-color-border",
  borderStrong: "--sembol-color-border-strong",
  fg: "--sembol-color-fg",
  fgMuted: "--sembol-color-fg-muted",
  success: "--sembol-color-success",
  successStrong: "--sembol-color-success-strong",
  successMuted: "--sembol-color-success-muted",
  danger: "--sembol-color-danger",
  dangerStrong: "--sembol-color-danger-strong",
  dangerMuted: "--sembol-color-danger-muted",
  overlay: "--sembol-color-overlay",
};

function radiusDecls(radius: SembolThemeRadius | undefined): string[] {
  if (radius === undefined) return [];
  const [sm, md, lg, full] =
    typeof radius === "number"
      ? [Math.max(0, radius - 2), radius, Math.round(radius * 1.6), 999]
      : RADIUS_PRESETS[radius];
  return [
    `--sembol-radius-sm: ${sm}px;`,
    `--sembol-radius: ${md}px;`,
    `--sembol-radius-lg: ${lg}px;`,
    `--sembol-radius-full: ${full}px;`,
  ];
}

/** Accent + per-scheme derivations, unless explicitly overridden. */
function accentDecls(
  accent: string | undefined,
  scheme: "light" | "dark",
  overrides: SembolThemeColors,
): string[] {
  if (!accent) return [];
  const mixTarget = scheme === "light" ? "#000000" : "#ffffff";
  const decls = [`--sembol-color-accent: ${accent};`];
  if (!overrides.accentHover) {
    decls.push(`--sembol-color-accent-hover: color-mix(in srgb, ${accent} 85%, ${mixTarget});`);
  }
  if (!overrides.accentActive) {
    decls.push(`--sembol-color-accent-active: color-mix(in srgb, ${accent} 72%, ${mixTarget});`);
  }
  if (!overrides.accentMuted) {
    decls.push(
      `--sembol-color-accent-muted: color-mix(in srgb, ${accent} ${scheme === "light" ? 12 : 16}%, transparent);`,
    );
  }
  return decls;
}

function colorDecls(colors: SembolThemeColors): string[] {
  return (Object.keys(colors) as (keyof SembolThemeColors)[])
    .filter((key) => colors[key] !== undefined)
    .map((key) => `${COLOR_VARS[key]}: ${colors[key]};`);
}

function sharedDecls(theme: SembolTheme): string[] {
  const decls = [...radiusDecls(theme.radius)];
  if (theme.fonts?.body) decls.push(`--sembol-font: ${theme.fonts.body};`);
  if (theme.fonts?.mono) decls.push(`--sembol-font-mono: ${theme.fonts.mono};`);
  if (theme.shadows === false) {
    decls.push(
      "--sembol-shadow-sm: none;",
      "--sembol-shadow: none;",
      "--sembol-shadow-lg: none;",
      "--sembol-shadow-xl: none;",
    );
  }
  return decls;
}

function block(selector: string, decls: string[]): string {
  return decls.length === 0 ? "" : `${selector} {\n  ${decls.join("\n  ")}\n}`;
}

/**
 * Compile a SembolTheme to a CSS string.
 *
 * The output must be inserted AFTER `styles.css` in document order (the
 * provider's inline `<style>` does this automatically). `selector` scopes
 * the theme; the default `:root` themes the whole page, while something
 * like `.checkout` themes one subtree.
 */
export function sembolThemeToCss(theme: SembolTheme, selector = ":root"): string {
  const light = theme.colors ?? {};
  const dark = { ...theme.colors, ...theme.darkColors };

  const lightDecls = [
    ...sharedDecls(theme),
    ...accentDecls(light.accent ?? theme.accent, "light", light),
    ...colorDecls(light),
  ];
  const darkDecls = [
    ...sharedDecls(theme),
    ...accentDecls(dark.accent ?? theme.accent, "dark", dark),
    ...colorDecls(dark),
  ];

  const isRoot = selector === ":root";
  const darkSelector = isRoot
    ? `[data-sembol-theme="dark"]`
    : `${selector}[data-sembol-theme="dark"], [data-sembol-theme="dark"] ${selector}, ${selector} [data-sembol-theme="dark"]`;
  // Mirrors styles.css: with no explicit attribute, dark follows the OS.
  const autoDarkSelector = isRoot ? `:root:not([data-sembol-theme])` : `${selector}:not([data-sembol-theme])`;

  return [
    block(selector, lightDecls),
    block(darkSelector, darkDecls),
    `@media (prefers-color-scheme: dark) {\n${block(autoDarkSelector, darkDecls)}\n}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Ready-made themes. Spread and override to make them yours:
 * `theme={{ ...sembolThemes.seal, radius: "full" }}`
 */
export const sembolThemes = {
  /** Sembol's own gold-on-ink brand. */
  seal: {
    colorScheme: "dark",
    accent: "#f5b841",
    colors: { onAccent: "#241a05" },
    darkColors: {
      onAccent: "#241a05",
      bg: "#0a0d14",
      surface: "#10151f",
      surfaceHover: "#161d2b",
      border: "#222b3c",
      borderStrong: "#34405a",
      fg: "#f4f2ec",
      fgMuted: "#9aa3b7",
      success: "#52dea0",
      danger: "#ff7070",
      overlay: "rgb(5 7 11 / 0.78)",
    },
    radius: "lg",
  },
  /** Cool blue, light-first. */
  ocean: {
    accent: "#0284c7",
    radius: "md",
  },
  /** Green, tighter corners. */
  forest: {
    accent: "#16a34a",
    radius: "sm",
  },
  /** Black and white, square, flat. */
  mono: {
    accent: "#171717",
    colors: { onAccent: "#ffffff" },
    darkColors: { accent: "#fafafa", onAccent: "#111111" },
    radius: "none",
    shadows: false,
  },
} satisfies Record<string, SembolTheme>;
