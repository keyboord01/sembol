import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ConnectWalletButton,
  CreateWalletButton,
  sembolThemeToCss,
  sembolThemes,
  type SembolTheme,
} from "@sembol/passkey-react";

/** All built-in presets side by side. Spread one and override to make it yours. */
function PresetPanel({ name, theme }: { name: string; theme: SembolTheme }) {
  const scope = `sembol-preset-${name}`;
  const dark = theme.colorScheme === "dark" ? "dark" : undefined;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <style>{sembolThemeToCss(theme, `.${scope}`)}</style>
      <code style={{ fontSize: 12.5 }}>sembolThemes.{name}</code>
      <div
        className={scope}
        data-sembol-theme={dark}
        style={{
          width: 260,
          padding: 20,
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "var(--sembol-color-bg)",
          border: "1px solid var(--sembol-color-border)",
          colorScheme: dark ?? "inherit",
        }}
      >
        <CreateWalletButton size="sm" />
        <ConnectWalletButton size="sm" variant="outline" />
        <span
          style={{
            fontSize: 12,
            padding: "4px 10px",
            alignSelf: "flex-start",
            borderRadius: "var(--sembol-radius-full)",
            background: "var(--sembol-color-accent-muted)",
            color: "var(--sembol-color-accent)",
          }}
        >
          accent chip
        </span>
      </div>
    </div>
  );
}

const meta = {
  title: "Theming/Presets",
  render: () => (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", maxWidth: 1200 }}>
      {(Object.entries(sembolThemes) as [string, SembolTheme][]).map(([name, theme]) => (
        <PresetPanel key={name} name={name} theme={theme} />
      ))}
    </div>
  ),
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          'Ready-made themes shipped with the package. Use as-is (`theme={sembolThemes.seal}`) or as a starting point (`theme={{ ...sembolThemes.ocean, radius: "full" }}`).',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Presets: Story = {};
