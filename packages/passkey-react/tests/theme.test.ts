import { describe, expect, it } from "vitest";
import { sembolThemeToCss, sembolThemes, type SembolTheme } from "../src/theme";

describe("sembolThemeToCss", () => {
  it("derives hover, active, and muted from a single accent per scheme", () => {
    const css = sembolThemeToCss({ accent: "#e11d48" });
    expect(css).toContain("--sembol-color-accent: #e11d48;");
    expect(css).toContain("color-mix(in srgb, #e11d48 85%, #000000)");
    expect(css).toContain("color-mix(in srgb, #e11d48 85%, #ffffff)");
    expect(css).toContain("color-mix(in srgb, #e11d48 12%, transparent)");
    expect(css).toContain("color-mix(in srgb, #e11d48 16%, transparent)");
  });

  it("explicit color overrides suppress the matching derivation", () => {
    const css = sembolThemeToCss({
      accent: "#e11d48",
      colors: { accentHover: "#111111" },
    });
    expect(css).toContain("--sembol-color-accent-hover: #111111;");
    expect(css).not.toContain("--sembol-color-accent-hover: color-mix(in srgb, #e11d48 85%, #000000)");
  });

  it("maps every color key to its CSS variable", () => {
    const css = sembolThemeToCss({
      colors: {
        bg: "#000",
        surface: "#111",
        surfaceHover: "#222",
        border: "#333",
        borderStrong: "#444",
        fg: "#eee",
        fgMuted: "#999",
        onAccent: "#fff",
        success: "#0f0",
        successStrong: "#0f8",
        successMuted: "#010",
        danger: "#f00",
        dangerStrong: "#f66",
        dangerMuted: "#100",
        overlay: "rgb(0 0 0 / 0.6)",
      },
    });
    for (const v of [
      "--sembol-color-bg: #000;",
      "--sembol-color-surface: #111;",
      "--sembol-color-surface-hover: #222;",
      "--sembol-color-border: #333;",
      "--sembol-color-border-strong: #444;",
      "--sembol-color-fg: #eee;",
      "--sembol-color-fg-muted: #999;",
      "--sembol-color-on-accent: #fff;",
      "--sembol-color-success: #0f0;",
      "--sembol-color-success-strong: #0f8;",
      "--sembol-color-success-muted: #010;",
      "--sembol-color-danger: #f00;",
      "--sembol-color-danger-strong: #f66;",
      "--sembol-color-danger-muted: #100;",
      "--sembol-color-overlay: rgb(0 0 0 / 0.6);",
    ]) {
      expect(css).toContain(v);
    }
  });

  it("darkColors layer on top of colors in the dark blocks only", () => {
    const css = sembolThemeToCss({
      colors: { bg: "#ffffff" },
      darkColors: { bg: "#0a0d14" },
    });
    const [lightBlock, ...rest] = css.split('[data-sembol-theme="dark"]');
    expect(lightBlock).toContain("--sembol-color-bg: #ffffff;");
    expect(lightBlock).not.toContain("#0a0d14");
    expect(rest.join("")).toContain("--sembol-color-bg: #0a0d14;");
  });

  it("radius presets scale all four radii, and numbers set the base", () => {
    expect(sembolThemeToCss({ radius: "none" })).toContain("--sembol-radius: 0px;");
    expect(sembolThemeToCss({ radius: "none" })).toContain("--sembol-radius-full: 0px;");
    expect(sembolThemeToCss({ radius: "lg" })).toContain("--sembol-radius-lg: 24px;");
    const numeric = sembolThemeToCss({ radius: 10 });
    expect(numeric).toContain("--sembol-radius-sm: 8px;");
    expect(numeric).toContain("--sembol-radius: 10px;");
    expect(numeric).toContain("--sembol-radius-lg: 16px;");
  });

  it("fonts and shadows: false emit their variables", () => {
    const css = sembolThemeToCss({
      fonts: { body: "Inter, sans-serif", mono: "Menlo, monospace" },
      shadows: false,
    });
    expect(css).toContain("--sembol-font: Inter, sans-serif;");
    expect(css).toContain("--sembol-font-mono: Menlo, monospace;");
    expect(css).toContain("--sembol-shadow-xl: none;");
  });

  it("emits an auto-dark media block mirroring styles.css specificity", () => {
    const css = sembolThemeToCss({ accent: "#123456" });
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain(":root:not([data-sembol-theme])");
  });

  it("scopes to a custom selector instead of :root", () => {
    const css = sembolThemeToCss({ accent: "#123456" }, ".checkout");
    expect(css).toContain(".checkout {");
    expect(css).not.toContain(":root {");
  });

  it("an empty theme produces no light block noise", () => {
    const css = sembolThemeToCss({});
    expect(css).not.toContain(":root {");
  });

  it("presets compile without throwing and pin sensible schemes", () => {
    for (const theme of Object.values(sembolThemes) as SembolTheme[]) {
      expect(() => sembolThemeToCss(theme)).not.toThrow();
    }
    expect(sembolThemes.seal.colorScheme).toBe("dark");
    expect(sembolThemeToCss(sembolThemes.mono)).toContain("--sembol-shadow: none;");
  });
});
