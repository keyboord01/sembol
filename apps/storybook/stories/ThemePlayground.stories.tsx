import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  ConnectWalletButton,
  CreateWalletButton,
  WalletBalance,
  sembolThemeToCss,
  sembolThemes,
  type SembolTheme,
} from "@sembol/passkey-react";

/**
 * The counterpart to Turnkey's config playground, but code-first: every
 * control edits a typed `SembolTheme`, the components restyle live, and the
 * exact `theme` prop you would paste into your app updates underneath.
 */
interface PlaygroundArgs {
  preset: "custom" | "seal" | "ocean" | "forest" | "mono";
  accent: string;
  onAccent: string;
  radius: "none" | "sm" | "md" | "lg" | "full";
  shadows: boolean;
  bodyFont: string;
}

const SCOPE = "sembol-playground-scope";

function buildTheme(args: PlaygroundArgs): SembolTheme {
  if (args.preset !== "custom") return sembolThemes[args.preset];
  return {
    accent: args.accent,
    colors: { onAccent: args.onAccent },
    radius: args.radius,
    shadows: args.shadows,
    ...(args.bodyFont.trim() ? { fonts: { body: args.bodyFont } } : {}),
  };
}

function Swatch({ label, varName }: { label: string; varName: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: "var(--sembol-color-fg-muted)",
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 4,
          background: `var(${varName})`,
          border: "1px solid var(--sembol-color-border)",
        }}
      />
      {label}
    </span>
  );
}

function CopySnippet({ theme }: { theme: SembolTheme }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<PasskeyWalletProvider\n  config={config}\n  theme={${JSON.stringify(theme, null, 2).replace(/\n/g, "\n  ")}}\n>`;
  return (
    <div style={{ position: "relative" }}>
      <pre
        style={{
          margin: 0,
          padding: 16,
          fontSize: 12.5,
          lineHeight: 1.55,
          overflowX: "auto",
          borderRadius: 10,
          border: "1px solid var(--sembol-color-border)",
          background: "var(--sembol-color-surface)",
          color: "var(--sembol-color-fg)",
        }}
      >
        <code>{snippet}</code>
      </pre>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(snippet).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          fontSize: 12,
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid var(--sembol-color-border)",
          background: "var(--sembol-color-bg)",
          color: copied ? "var(--sembol-color-success)" : "var(--sembol-color-fg-muted)",
        }}
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}

function Playground(args: PlaygroundArgs) {
  const theme = buildTheme(args);
  const css = sembolThemeToCss(theme, `.${SCOPE}`);
  const scopeDark = theme.colorScheme === "dark" ? "dark" : undefined;

  return (
    <div className="sembol-story-stack" style={{ maxWidth: 620 }}>
      <style>{css}</style>
      <div
        className={SCOPE}
        data-sembol-theme={scopeDark}
        style={{
          padding: 28,
          borderRadius: 16,
          background: "var(--sembol-color-bg)",
          border: "1px solid var(--sembol-color-border)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          colorScheme: scopeDark ?? "inherit",
        }}
      >
        <div className="sembol-story-row">
          <CreateWalletButton />
          <ConnectWalletButton variant="outline" />
        </div>
        <div className="sembol-story-row">
          <CreateWalletButton variant="secondary" size="sm" label="Secondary" />
          <CreateWalletButton variant="ghost" size="sm" label="Ghost" />
          <CreateWalletButton variant="destructive" size="sm" label="Destructive" />
        </div>
        <WalletBalance />
        <div className="sembol-story-row" style={{ gap: 14 }}>
          <Swatch label="accent" varName="--sembol-color-accent" />
          <Swatch label="surface" varName="--sembol-color-surface" />
          <Swatch label="border" varName="--sembol-color-border" />
          <Swatch label="success" varName="--sembol-color-success" />
          <Swatch label="danger" varName="--sembol-color-danger" />
        </div>
      </div>
      <CopySnippet theme={theme} />
    </div>
  );
}

const meta = {
  title: "Theming/Playground",
  render: (args) => <Playground {...args} />,
  args: {
    preset: "custom",
    accent: "#e11d48",
    onAccent: "#ffffff",
    radius: "md",
    shadows: true,
    bodyFont: "",
  },
  argTypes: {
    preset: {
      control: "select",
      options: ["custom", "seal", "ocean", "forest", "mono"],
      description: "Start from a preset, or build a custom theme with the controls below",
    },
    accent: { control: "color", if: { arg: "preset", eq: "custom" } },
    onAccent: { control: "color", if: { arg: "preset", eq: "custom" } },
    radius: {
      control: "inline-radio",
      options: ["none", "sm", "md", "lg", "full"],
      if: { arg: "preset", eq: "custom" },
    },
    shadows: { control: "boolean", if: { arg: "preset", eq: "custom" } },
    bodyFont: {
      control: "text",
      description: 'CSS font stack, e.g. "Georgia, serif"',
      if: { arg: "preset", eq: "custom" },
    },
  },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "Every control edits a typed **`SembolTheme`** object. The components restyle live, and the exact `theme` prop to paste into your app is generated below the preview - copy it and you are done. No CSS required.",
          "",
          "One `accent` retints the whole kit: hover, active, muted, and the focus ring derive from it per color scheme. Prefer CSS? Every value is still a `--sembol-*` custom property you can override by hand.",
        ].join("\n"),
      },
    },
  },
} satisfies Meta<PlaygroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground_: Story = { name: "Playground" };
