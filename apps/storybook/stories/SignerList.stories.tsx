import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConnectWalletButton, SignerList } from "@sembol/passkey-react";

const meta = {
  title: "Components/SignerList",
  component: SignerList,
  tags: ["autodocs"],
  args: {
    onRemoved: fn(),
    onError: fn(),
  },
  parameters: {
    docs: {
      description: {
        component: [
          "The connected account's signers - passkeys, Ed25519 recovery keys, delegated wallets - read live from its on-chain context rules, with guarded removal. The currently-connected passkey is tagged **This device**, and nicknames stored on this browser are shown above the truncated key.",
          "",
          "```tsx",
          'import { SignerList } from "@sembol/passkey-react";',
          "",
          "<SignerList",
          "  onRemoved={(signer) => console.log(signer.key)}",
          "  onError={(error) => console.log(error.userMessage)}",
          "/>",
          "```",
          "",
          "**Live demo:** connect a wallet with the button above the story and the real testnet signer list appears. Add entries in the *AddSignerButton* story, then remove one here - removal is a real passkey approval plus an on-chain transaction.",
          "",
          "**Accessibility:** removal is a **two-step confirm** - *Remove* swaps to *Confirm remove* / *Cancel*, so a stray click never reaches a passkey prompt. The **last remaining signer can never be removed** (that would lock the account forever): its Remove button is rendered `disabled` with a `title` explaining the reason. Each Remove button carries an `aria-label` naming its signer, removing the active device's passkey warns via `title` that it signs you out here, and loading / error states use `role=status` / `role=alert`.",
        ].join("\n"),
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="sembol-story-stack">
        <div className="sembol-story-row">
          <ConnectWalletButton />
        </div>
        <div className="sembol-story-card">
          <div className="sembol-story-card__body">
            <Story />
          </div>
        </div>
        <p className="sembol-story-note">
          Connect (or create a wallet in the Live Playground) to see the account's real signers.
        </p>
      </div>
    ),
  ],
} satisfies Meta<typeof SignerList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Live signer list with removal (two-step confirm, last-signer guard). */
export const Default: Story = {};

/** `readOnly` hides the remove actions - a display-only signer overview. */
export const ReadOnly: Story = {
  args: { readOnly: true },
};
