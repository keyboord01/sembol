import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { AddSignerButton, ConnectWalletButton } from "@sembol/passkey-react";

const meta = {
  title: "Components/AddSignerButton",
  component: AddSignerButton,
  tags: ["autodocs"],
  args: {
    onAdded: fn(),
    onError: fn(),
  },
  argTypes: {
    method: {
      control: "select",
      options: ["passkey", "ed25519", "wallet"],
    },
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "destructive"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
  parameters: {
    docs: {
      description: {
        component: [
          "Adds a signer to the connected smart account: a **new passkey** (on this or another device), an offline **Ed25519 recovery key** (G…), or an existing **Stellar address** as a delegated co-signer. Omit `method` to offer all three in a chooser panel; pin `method` to jump straight to one form. Every path ends in a single passkey approval from the currently-connected signer, and each added signer gets its own rule so any enrolled credential can act alone (any-of-N).",
          "",
          "```tsx",
          'import { AddSignerButton } from "@sembol/passkey-react";',
          "",
          "<AddSignerButton />                    // chooser with all three methods",
          '<AddSignerButton method="passkey" />   // straight to the new-passkey form',
          "```",
          "",
          "**The passkey path is a two-prompt flow:** first the browser registers the brand-new passkey (nothing on-chain yet), then you approve the add-signer transaction with your **current** passkey. Two WebAuthn prompts back to back is by design, not a stuck UI - the button narrates each phase (*Creating the new passkey…*, *Approve with your current passkey…*, *Adding signer on-chain…*).",
          "",
          "**Live demo:** connect a wallet with the button above the story, add a signer, then verify it in the *SignerList* story. The Ed25519 path needs `ed25519VerifierAddress` in the config - included in the `SEMBOL_TESTNET_ARTIFACTS` preset this Storybook runs on.",
          "",
          "**Accessibility:** the trigger is a `button` with `aria-expanded`/`aria-controls` for the panel; the method chooser is a labelled `role=group`; every input has a `<label>`; the button disables itself while busy and announces progress in its label.",
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
          Connect (or create a wallet in the Live Playground) first - adding a signer needs a
          connected wallet to approve it.
        </p>
      </div>
    ),
  ],
} satisfies Meta<typeof AddSignerButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default chooser: new passkey, Ed25519 recovery key, or delegated Stellar address. */
export const Default: Story = {};

/**
 * Pinned to `method="passkey"`: skips the chooser and opens the new-passkey
 * form directly. Expect two prompts - register the new passkey, then approve
 * with the current one.
 */
export const PasskeyOnly: Story = {
  args: { method: "passkey", label: "Add a passkey" },
};
