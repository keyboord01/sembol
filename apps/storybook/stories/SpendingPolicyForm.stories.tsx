import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConnectWalletButton, SpendingPolicyForm } from "@sembol/passkey-react";

const meta = {
  title: "Components/SpendingPolicyForm",
  component: SpendingPolicyForm,
  tags: ["autodocs"],
  args: {
    onChanged: fn(),
    onError: fn(),
  },
  parameters: {
    docs: {
      description: {
        component: [
          "Reads and manages the wallet's spending limit for a token (native XLM by default, any SEP-41 contract via `token`). Shows the current limit with a usage meter (spent / remaining in the rolling window) and a form to set, update, or remove it. The limit lives in a token-scoped context rule carrying the deployed spending-limit policy contract, so it's enforced **on-chain**, not in the UI.",
          "",
          "```tsx",
          'import { SpendingPolicyForm } from "@sembol/passkey-react";',
          "",
          "<SpendingPolicyForm />                                   // native XLM",
          '<SpendingPolicyForm token={{ contractId: "C…" }} tokenSymbol="USDC" />',
          "```",
          "",
          "**Enforcement note (honest edition):** limits enforce on transfers built as **direct token invocations** - which is how Sembol's send path (`useTransfer`, `buildTransferTransaction`) submits payments. smart-account-kit 0.4.2's own `kit.transfer()` wraps transfers in `execute` and is **not** covered until the kit's next release. Changing the window length re-installs the policy and asks for **two** passkey approvals; a limit-only change is a single approval.",
          "",
          "**Live demo:** connect a wallet with the button above the story, set a limit (a real passkey approval + on-chain transaction), then try sending more than the limit in the *Live Playground* - the transfer is rejected by the account contract.",
          "",
          "**Accessibility:** the usage bar is a real `role=meter` with `aria-valuenow`; *Remove limit* is a **two-step confirm** (*Confirm remove* / *Cancel*); amount and window fields are labelled; progress states use `role=status` and the submit button narrates each phase.",
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
          Connect (or create a wallet in the Live Playground) to read and set the wallet's real
          on-chain spending limit.
        </p>
      </div>
    ),
  ],
} satisfies Meta<typeof SpendingPolicyForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Live spending limit for native XLM: usage meter plus set / update / remove. */
export const Default: Story = {};
