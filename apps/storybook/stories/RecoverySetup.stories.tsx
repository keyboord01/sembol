import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConnectWalletButton, RecoverySetup } from "@sembol/passkey-react";

const meta = {
  title: "Components/RecoverySetup",
  component: RecoverySetup,
  tags: ["autodocs"],
  args: {
    onEnrolled: fn(),
    onRecovered: fn(),
    onError: fn(),
  },
  argTypes: {
    mode: {
      control: "select",
      options: ["setup", "recover"],
    },
  },
  parameters: {
    docs: {
      description: {
        component: [
          "Guided account recovery in two modes. **`mode=\"setup\"`** (default) enrolls a recovery credential - a passkey on another device or an offline Ed25519 key - on the connected wallet. Do this **while you still have the device**: once the only passkey is gone, nothing is left to approve the enrollment with. After enrolling, the component shows the wallet address and asks the user to save it somewhere safe.",
          "",
          "**`mode=\"recover\"`** is the fresh-browser flow for the day the phone is lost. One passkey prompt, then wallet discovery in order: this browser's **local credential map**, then the **public indexer**, then the deterministic deploy address (original deploy credential only). When none of those finds the wallet, a **manual address input** appears asking for the address saved during setup. If one credential signs for several wallets, a chooser is shown instead.",
          "",
          "```tsx",
          'import { RecoverySetup } from "@sembol/passkey-react";',
          "",
          "<RecoverySetup onEnrolled={({ credentialId }) => console.log(credentialId)} />",
          "",
          '<RecoverySetup   // on the new device',
          '  mode="recover"',
          "  onRecovered={({ contractId }) => console.log(contractId)}",
          "/>",
          "```",
          "",
          "**Live demo:** connect a wallet, enroll a recovery credential in *Setup*, then disconnect and use *Recover* to get back in - all real testnet transactions and WebAuthn prompts.",
          "",
          "**Accessibility:** method and wallet choices are labelled `role=group`s, the manual-address fallback announces itself via `role=alert`, success uses `role=status`, and every input has a `<label>`.",
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
          Setup mode needs a connected wallet (connect or create one in the Live Playground).
          Recover mode works while disconnected, but needs a credential enrolled earlier on this
          Storybook's domain.
        </p>
      </div>
    ),
  ],
} satisfies Meta<typeof RecoverySetup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Enroll a recovery credential on the connected wallet - a passkey on another
 * device or an offline Ed25519 key - then save the wallet address it shows.
 */
export const Setup: Story = {};

/**
 * Fresh-browser recovery: passkey prompt, then discovery (local map, indexer,
 * deploy address), falling back to a manual wallet-address input when the
 * wallet can't be found automatically.
 */
export const Recover: Story = {
  args: { mode: "recover" },
};
