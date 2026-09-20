import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { AgentPermissions, ConnectWalletButton } from "@sembol/passkey-react";

const meta = {
  title: "Components/AgentPermissions",
  component: AgentPermissions,
  tags: ["autodocs"],
  args: { onRevoked: fn(), onError: fn() },
  parameters: {
    docs: {
      description: {
        component: [
          "Every agent grant on the connected account: the agent key, the context it applies to, the policies enforcing it, time left, and a **two-step revoke**. Revoking removes the rule, so nothing the agent signs afterwards is accepted by the account.",
          "",
          "```tsx",
          'import { AgentPermissions } from "@sembol/passkey-react";',
          "",
          "<AgentPermissions onRevoked={(grant) => toast(`Revoked ${grant.name}`)} />",
          "```",
          "",
          "Grants without a policy are flagged as unrestricted.",
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
      </div>
    ),
  ],
} satisfies Meta<typeof AgentPermissions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Live list of agent grants with revoke. */
export const Default: Story = {};

/** Read-only listing. */
export const ReadOnly: Story = { args: { readOnly: true } };
