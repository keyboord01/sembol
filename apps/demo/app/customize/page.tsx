"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ConnectWalletButton,
  CreateWalletButton,
  WalletBalance,
  sembolThemeToCss,
  sembolThemes,
  type SembolTheme,
} from "@sembol/passkey-react";
import { SembolLogo, SembolMark } from "../../components/Brand";
import { ArrowUpRightIcon, CheckIcon, CopyIcon } from "../../components/icons";

const SCOPE = "customize-scope";

/* Neutral library defaults scoped to the preview, so the site's own dark
 * theme cannot leak into it. The dynamic theme <style> comes after and wins. */
const RESET_CSS = `
.customize-scope {
  --sembol-color-bg: #ffffff;
  --sembol-color-surface: #f6f7f9;
  --sembol-color-surface-hover: #eef0f3;
  --sembol-color-border: #e4e6ea;
  --sembol-color-border-strong: #cfd3d9;
  --sembol-color-fg: #17181c;
  --sembol-color-fg-muted: #6b7280;
  --sembol-color-accent: #4f46e5;
  --sembol-color-accent-hover: #4338ca;
  --sembol-color-accent-active: #3730a3;
  --sembol-color-accent-muted: #eef2ff;
  --sembol-color-on-accent: #ffffff;
  --sembol-color-success: #16a34a;
  --sembol-color-success-strong: #15803d;
  --sembol-color-success-muted: #f0fdf4;
  --sembol-color-danger: #dc2626;
  --sembol-color-danger-strong: #b91c1c;
  --sembol-color-danger-muted: #fef2f2;
  --sembol-color-overlay: rgb(15 18 25 / 0.55);
  --sembol-radius-sm: 8px;
  --sembol-radius: 10px;
  --sembol-radius-lg: 16px;
  --sembol-radius-full: 999px;
  --sembol-shadow-sm: 0 1px 2px 0 rgb(16 24 40 / 0.06);
  --sembol-shadow: 0 1px 3px 0 rgb(16 24 40 / 0.1), 0 1px 2px -1px rgb(16 24 40 / 0.1);
  --sembol-shadow-lg: 0 12px 16px -4px rgb(16 24 40 / 0.1), 0 4px 6px -2px rgb(16 24 40 / 0.05);
  --sembol-shadow-xl: 0 20px 24px -4px rgb(16 24 40 / 0.1), 0 8px 8px -4px rgb(16 24 40 / 0.04);
  --sembol-font: ui-sans-serif, system-ui, sans-serif;
}
.customize-scope[data-sembol-theme="dark"] {
  --sembol-color-bg: #101114;
  --sembol-color-surface: #191b1f;
  --sembol-color-surface-hover: #22242a;
  --sembol-color-border: #26282e;
  --sembol-color-border-strong: #3a3d45;
  --sembol-color-fg: #f2f3f5;
  --sembol-color-fg-muted: #9ba1ab;
  --sembol-color-accent: #6366f1;
  --sembol-color-accent-hover: #7679f2;
  --sembol-color-accent-active: #575af0;
  --sembol-color-accent-muted: rgb(99 102 241 / 0.16);
  --sembol-color-success: #4ade80;
  --sembol-color-success-strong: #86efac;
  --sembol-color-success-muted: rgb(34 197 94 / 0.12);
  --sembol-color-danger: #f87171;
  --sembol-color-danger-strong: #fca5a5;
  --sembol-color-danger-muted: rgb(239 68 68 / 0.12);
  --sembol-color-overlay: rgb(0 0 0 / 0.65);
}
`;

const PRESETS = ["custom", "seal", "ocean", "forest", "mono"] as const;
type Preset = (typeof PRESETS)[number];

const FONTS = [
  { label: "System", value: "" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "ui-monospace, 'SF Mono', Menlo, monospace" },
] as const;

interface BuilderState {
  preset: Preset;
  accent: string;
  onAccent: string;
  bg: string; // "" = library default for the active scheme
  dark: boolean;
  radius: number;
  shadows: boolean;
  font: string;
}

const DEFAULTS: BuilderState = {
  preset: "custom",
  accent: "#4f46e5",
  onAccent: "#ffffff",
  bg: "",
  dark: false,
  radius: 10,
  shadows: true,
  font: "",
};

/* Selecting a preset hydrates every control, so tweaking one knob
 * continues FROM the preset instead of snapping back to older values. */
const PRESET_STATES: Record<Exclude<Preset, "custom">, Omit<BuilderState, "preset">> = {
  seal: { accent: "#f5b841", onAccent: "#241a05", bg: "", dark: true, radius: 16, shadows: true, font: "" },
  ocean: { accent: "#0284c7", onAccent: "#ffffff", bg: "", dark: false, radius: 10, shadows: true, font: "" },
  forest: { accent: "#16a34a", onAccent: "#ffffff", bg: "", dark: false, radius: 6, shadows: true, font: "" },
  mono: { accent: "#171717", onAccent: "#ffffff", bg: "", dark: false, radius: 0, shadows: false, font: "" },
};

function buildTheme(s: BuilderState): SembolTheme {
  // Untouched presets stay faithful (including their dark palettes).
  if (s.preset !== "custom") return sembolThemes[s.preset];
  const mix = s.dark ? "#ffffff" : "#000000";
  return {
    colorScheme: s.dark ? "dark" : "light",
    accent: s.accent,
    colors: {
      onAccent: s.onAccent,
      ...(s.bg
        ? {
            bg: s.bg,
            surface: `color-mix(in srgb, ${s.bg} 94%, ${mix})`,
            surfaceHover: `color-mix(in srgb, ${s.bg} 90%, ${mix})`,
            border: `color-mix(in srgb, ${s.bg} 86%, ${mix})`,
          }
        : {}),
    },
    radius: s.radius,
    shadows: s.shadows,
    ...(s.font ? { fonts: { body: s.font } } : {}),
  };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-sm text-dim">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-gold" : "bg-raised"}`}
    >
      <span
        className={`absolute top-0.5 left-0 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`}
      />
    </button>
  );
}

const SELECT_CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239aa3b7' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export default function CustomizePage() {
  const [state, setState] = useState<BuilderState>(DEFAULTS);
  const [copied, setCopied] = useState(false);
  const set = <K extends keyof BuilderState>(key: K, value: BuilderState[K]) =>
    setState((s) => ({ ...s, [key]: value, ...(key !== "preset" ? { preset: "custom" as Preset } : {}) }));

  const theme = buildTheme(state);
  const css = sembolThemeToCss(theme, `.${SCOPE}`);
  const dark = theme.colorScheme === "dark";
  const snippet = `<PasskeyWalletProvider\n  config={config}\n  theme={${JSON.stringify(theme, null, 2).replace(/\n/g, "\n  ")}}\n>`;

  const copy = () => {
    void navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <style>{RESET_CSS}</style>
      <style>{css}</style>

      <header className="sticky top-0 z-40 border-b border-hairline/70 bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Sembol home">
            <SembolLogo />
          </Link>
          <nav className="flex items-center gap-6 text-sm text-dim" aria-label="Builder">
            <Link href="/" className="transition-colors hover:text-fg">Home</Link>
            <a
              href="https://storybook.sembol.xyz"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1 transition-colors hover:text-fg sm:inline-flex"
            >
              Storybook <ArrowUpRightIcon size={13} />
            </a>
            <Link href="/wallet" className="btn-gold btn-seal h-9 px-4 text-sm">
              Try the wallet
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[320px_1fr]">
        {/* ---------- controls ---------- */}
        <aside className="card h-fit p-5" aria-label="Theme controls">
          <p className="microlabel text-gold">Theme builder</p>
          <p className="mt-2 text-sm leading-relaxed text-dim">
            Restyle the wallet to your brand. Every control edits a typed{" "}
            <code className="font-mono text-[12px] text-fg">SembolTheme</code>, live.
          </p>

          <p className="microlabel mt-6 mb-2 text-faint">Preset</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() =>
                  setState(p === "custom" ? { ...DEFAULTS } : { preset: p, ...PRESET_STATES[p] })
                }
                className={`chip transition-colors ${state.preset === p ? "border-gold/60 text-gold" : "hover:border-gold/40 hover:text-fg"}`}
              >
                {p}
              </button>
            ))}
          </div>

          <p className="microlabel mt-6 mb-1 text-faint">Brand</p>
          <div className="divide-y divide-hairline/50">
            <Row label="Accent color">
              <span className="flex items-center gap-2">
                <input
                  type="color"
                  value={state.accent}
                  onChange={(e) => set("accent", e.target.value)}
                  aria-label="Accent color"
                  className="h-8 w-8 cursor-pointer rounded-md border border-hairline bg-transparent"
                />
                <code className="tnum font-mono text-xs text-dim">{state.accent}</code>
              </span>
            </Row>
            <Row label="Text on accent">
              <span className="flex items-center gap-2">
                <input
                  type="color"
                  value={state.onAccent}
                  onChange={(e) => set("onAccent", e.target.value)}
                  aria-label="Text color on accent"
                  className="h-8 w-8 cursor-pointer rounded-md border border-hairline bg-transparent"
                />
                <code className="tnum font-mono text-xs text-dim">{state.onAccent}</code>
              </span>
            </Row>
            <Row label="Background">
              <span className="flex items-center gap-2">
                {state.bg && (
                  <button
                    type="button"
                    onClick={() => set("bg", "")}
                    className="text-xs text-faint transition-colors hover:text-fg"
                  >
                    reset
                  </button>
                )}
                <input
                  type="color"
                  value={state.bg || (state.dark ? "#101114" : "#ffffff")}
                  onChange={(e) => set("bg", e.target.value)}
                  aria-label="Background color"
                  className="h-8 w-8 cursor-pointer rounded-md border border-hairline bg-transparent"
                />
                <code className="tnum font-mono text-xs text-dim">{state.bg || "auto"}</code>
              </span>
            </Row>
            <Row label="Dark mode">
              <Toggle on={state.dark} onChange={(v) => set("dark", v)} />
            </Row>
            <Row label={`Corner radius · ${state.radius}px`}>
              <input
                type="range"
                min={0}
                max={24}
                value={state.radius}
                onChange={(e) => set("radius", Number(e.target.value))}
                aria-label="Corner radius"
                className="w-28 accent-[var(--color-gold)]"
              />
            </Row>
            <Row label="Shadows">
              <Toggle on={state.shadows} onChange={(v) => set("shadows", v)} />
            </Row>
            <Row label="Font">
              <select
                value={state.font}
                onChange={(e) => set("font", e.target.value)}
                aria-label="Body font"
                className="appearance-none rounded-lg border border-hairline bg-ink py-1.5 pr-8 pl-3 text-sm text-fg"
                style={{
                  backgroundImage: SELECT_CHEVRON,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                }}
              >
                {FONTS.map((f) => (
                  <option key={f.label} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Row>
          </div>

          <p className="microlabel mt-6 mb-2 text-faint">Your config</p>
          <p className="mb-3 text-xs leading-relaxed text-faint">
            Paste this into your app. That is the whole integration.
          </p>
          <div className="relative">
            <pre className="max-h-64 overflow-auto rounded-xl border border-hairline bg-ink p-3.5 font-mono text-[11.5px] leading-relaxed text-fg">
              <code>{snippet}</code>
            </pre>
            <button
              type="button"
              onClick={copy}
              className={`absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1 text-xs transition-colors ${copied ? "text-mint" : "text-dim hover:text-fg"}`}
            >
              {copied ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <a
            href="https://storybook.sembol.xyz"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-dim transition-colors hover:text-gold"
          >
            Every component, every state: live Storybook <ArrowUpRightIcon size={13} />
          </a>
        </aside>

        {/* ---------- live preview ---------- */}
        <section aria-label="Live preview" className="grid-bg relative rounded-2xl border border-hairline">
          <div className="flex min-h-[560px] items-center justify-center p-6 sm:p-12">
            {/* inert: looks alive, never triggers a passkey prompt */}
            <div
              inert
              className={`${SCOPE} select-none`}
              data-sembol-theme={dark ? "dark" : "light"}
              style={{ colorScheme: dark ? "dark" : "light" }}
            >
              <div
                className="flex w-[min(88vw,380px)] flex-col gap-5 border p-7"
                style={{
                  background: "var(--sembol-color-bg)",
                  borderColor: "var(--sembol-color-border)",
                  borderRadius: "var(--sembol-radius-lg)",
                  boxShadow: "var(--sembol-shadow)",
                  fontFamily: "var(--sembol-font)",
                  color: "var(--sembol-color-fg)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold">Your app</span>
                  <SembolMark size={16} className="opacity-40" title="" />
                </div>
                <p className="text-sm" style={{ color: "var(--sembol-color-fg-muted)" }}>
                  Real components from @sembol/passkey-react, wearing your theme.
                </p>
                <CreateWalletButton />
                <ConnectWalletButton variant="outline" />
                <div
                  className="border p-4"
                  style={{
                    background: "var(--sembol-color-surface)",
                    borderColor: "var(--sembol-color-border)",
                    borderRadius: "var(--sembol-radius)",
                  }}
                >
                  <WalletBalance />
                </div>
                <div className="flex gap-2">
                  <CreateWalletButton variant="secondary" size="sm" label="Secondary" />
                  <CreateWalletButton variant="destructive" size="sm" label="Destructive" />
                </div>
              </div>
            </div>
          </div>
          <p className="microlabel absolute bottom-4 left-1/2 w-full -translate-x-1/2 px-4 text-center text-faint">
            Preview only · create a real wallet from Try the wallet
          </p>
        </section>
      </main>
    </div>
  );
}
