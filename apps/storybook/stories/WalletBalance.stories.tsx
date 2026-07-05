import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConnectWalletButton, WalletBalance } from "@sembol/passkey-react";

const meta = {
  title: "Components/WalletBalance",
  component: WalletBalance,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "Live token balance for the connected wallet: skeleton while loading, friendly error state, and **automatic refresh after every transaction** submitted through the kit. Reads the native XLM SAC by default; pass `token` for any SEP-41 contract.",
          "",
          "```tsx",
          'import { WalletBalance } from "@sembol/passkey-react";',
          "",
          "<WalletBalance />                                        // native XLM",
          '<WalletBalance token={{ contractId: "C…" }} />           // any token',
          '<WalletBalance refreshInterval={15_000} showRefresh={false} />',
          "```",
          "",
          "**Live demo:** connect a wallet with the button below the story and the real testnet balance appears.",
          "",
          "**Accessibility:** wraps the value in `aria-live=polite` so balance changes are announced; the refresh control is a labelled icon button.",
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
          <Story />
        </div>
        <p className="sembol-story-note">
          Connect (or create a wallet in the Live Playground) to see a real testnet balance.
        </p>
      </div>
    ),
  ],
} satisfies Meta<typeof WalletBalance>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Native XLM balance of the connected wallet. */
export const Default: Story = {};

/** Polls every 10 seconds in addition to post-transaction refreshes. */
export const Polling: Story = {
  args: { refreshInterval: 10_000 },
};

/** Without the manual refresh affordance. */
export const NoRefreshButton: Story = {
  args: { showRefresh: false },
};
