import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CreateWalletButton } from "@sembol/passkey-react";

const meta = {
  title: "Components/CreateWalletButton",
  component: CreateWalletButton,
  tags: ["autodocs"],
  args: {
    userName: "storybook-visitor",
    onSuccess: fn(),
    onError: fn(),
  },
  parameters: {
    docs: {
      description: {
        component: [
          "Creates a passkey and deploys a smart-account contract in one click, with live progress labels for each phase: *Waiting for your passkey…* → *Deploying wallet…* → *Funding wallet…* (testnet Friendbot).",
          "",
          "> ⚠️ **This story is live.** Clicking the button registers a **real passkey** in your browser/OS credential manager and deploys a **real contract on Stellar testnet** (funded with free test XLM). You can delete the passkey from your credential manager afterwards.",
          "",
          "```tsx",
          'import { CreateWalletButton } from "@sembol/passkey-react";',
          "",
          "<CreateWalletButton",
          '  userName="you@example.com"   // shown in the OS passkey prompt',
          "  fund                          // testnet: auto-fund via Friendbot (default)",
          "  onSuccess={({ contractId }) => router.push(`/dashboard`)}",
          "/>",
          "```",
          "",
          "**Accessibility:** a single `button` whose text content announces progress (safe for screen readers); disabled with an explanatory `title` when WebAuthn is unavailable.",
        ].join("\n"),
      },
    },
  },
} satisfies Meta<typeof CreateWalletButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Creates a real testnet wallet. Watch the label walk through each phase. */
export const Default: Story = {};

/** Skip Friendbot funding (`fund={false}`) — wallet deploys with zero balance. */
export const WithoutFunding: Story = {
  args: { fund: false, label: "Create empty wallet" },
};

/** Custom nickname stored alongside the credential for later display. */
export const WithNickname: Story = {
  args: { nickname: "My Storybook wallet", label: "Create named wallet" },
};
