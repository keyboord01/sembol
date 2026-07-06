import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConnectWalletButton } from "@sembol/passkey-react";

const meta = {
  title: "Components/ConnectWalletButton",
  component: ConnectWalletButton,
  tags: ["autodocs"],
  args: {
    onConnected: fn(),
    onDisconnected: fn(),
    onError: fn(),
  },
  argTypes: {
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
          "Connects to an existing passkey wallet. Tries the stored session first, then prompts for a passkey. Once connected it becomes an **account chip** with a menu: copy address, view on stellar.expert, switch wallet, disconnect.",
          "",
          "**Live demo:** this story runs against Stellar testnet — if you've created a wallet in the *Live Playground* story, clicking Connect will restore it with a real passkey prompt.",
          "",
          "```tsx",
          'import { ConnectWalletButton } from "@sembol/passkey-react";',
          "",
          "<ConnectWalletButton",
          '  label="Connect wallet"',
          "  onConnected={({ contractId }) => console.log(contractId)}",
          "/>",
          "```",
          "",
          "**Accessibility:** the chip is a `button` with `aria-haspopup`/`aria-expanded`; the menu uses `role=menu`/`menuitem`, closes on Escape and outside click. The button disables itself (with an explanatory `title`) in browsers without WebAuthn support.",
        ].join("\n"),
      },
    },
  },
} satisfies Meta<typeof ConnectWalletButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default appearance. Click to trigger a real passkey prompt (testnet). */
export const Default: Story = {};

/** Custom label via the `label` prop. */
export const CustomLabel: Story = {
  args: { label: "Sign in with passkey" },
};

/** All visual variants: `primary`, `secondary`, `outline`, `ghost`, `destructive`. */
export const Variants: Story = {
  render: (args) => (
    <div className="sembol-story-row">
      <ConnectWalletButton {...args} variant="primary" label="Primary" />
      <ConnectWalletButton {...args} variant="secondary" label="Secondary" />
      <ConnectWalletButton {...args} variant="outline" label="Outline" />
      <ConnectWalletButton {...args} variant="ghost" label="Ghost" />
      <ConnectWalletButton {...args} variant="destructive" label="Destructive" />
    </div>
  ),
};

/** Sizes: `sm`, `md` (default), `lg`. */
export const Sizes: Story = {
  render: (args) => (
    <div className="sembol-story-row">
      <ConnectWalletButton {...args} size="sm" label="Small" />
      <ConnectWalletButton {...args} size="md" label="Medium" />
      <ConnectWalletButton {...args} size="lg" label="Large" />
    </div>
  ),
};

/**
 * `unstyled` drops every built-in class so you can bring your own design
 * system — here styled with a plain inline style for demonstration.
 */
export const Unstyled: Story = {
  args: {
    unstyled: true,
    className: "my-custom-connect",
  },
  render: (args) => (
    <>
      <style>{`.my-custom-connect { padding: 10px 18px; border-radius: 999px; border: 2px dashed #f59e0b; background: transparent; font-weight: 700; cursor: pointer; color: inherit; }`}</style>
      <ConnectWalletButton {...args} />
    </>
  ),
};
