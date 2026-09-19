import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { xdr } from "@stellar/stellar-sdk";
import { ConnectWalletButton, GrantAgentAccess, SEMBOL_TESTNET_ARTIFACTS } from "@sembol/passkey-react";

// A throwaway agent key (public half only). A real app gets this from its keeper / bot backend.
const DEMO_AGENT_PUBLIC_KEY = "GBVD753EJMRQYI6WQCWC4OMDCNMGQMHXRT7IOAHTT3FD7ON6OQXTSAK3";

const meta = {
  title: "Components/GrantAgentAccess",
  component: GrantAgentAccess,
  tags: ["autodocs"],
  args: {
    agentPublicKey: DEMO_AGENT_PUBLIC_KEY,
    name: "demo-agent",
    agentLabel: "the demo keeper",
    // The deployed spending-limit policy with void params stands in for a real policy here; a production grant
    // installs the app's own policy contract with its install params as an xdr.ScVal.
    policies: new Map([[SEMBOL_TESTNET_ARTIFACTS.spendingLimitPolicyAddress, xdr.ScVal.scvVoid()]]),
    validFor: { hours: 1 },
    summary: ["Call the app's router contract", "Send USDC to the lending pool only", "At most 40 calls per ~3 hours"],
    onGranted: fn(),
    onError: fn(),
  },
  parameters: {
    docs: {
      description: {
        component: [
          "One-screen consent for giving a software agent (a keeper, a bot, an AI) scoped access to the wallet. The grant is a context rule whose signer is the agent's **Ed25519 public key** and whose **policies decide on-chain** what that key may authorize. The app never sees the agent's secret; the agent signs its own transactions elsewhere (smart-account-kit's `Ed25519Signer`).",
          "",
          "```tsx",
          'import { GrantAgentAccess } from "@sembol/passkey-react";',
          "",
          "<GrantAgentAccess",
          '  agentPublicKey="G…"                       // from your backend',
          "  policies={new Map([[MY_POLICY, installParamsScVal]])}",
          '  name="keeper"',
          "  validFor={{ days: 7 }}",
          '  summary={["Rebalance between markets", "Repay debt from idle USDC"]}',
          "  onGranted={({ ruleId }) => save(ruleId)}",
          "/>",
          "```",
          "",
          "**Safety:** a rule with an agent signer and **no policy** is full account access. The hook refuses that unless `allowUnrestricted: true` is passed, and the component labels it in red.",
          "",
          "**Live demo:** connect a wallet, then grant. One passkey approval installs the rule on testnet; `<AgentPermissions />` shows and revokes it.",
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
} satisfies Meta<typeof GrantAgentAccess>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Consent screen for a one-hour grant under a policy contract. */
export const Default: Story = {};

/** Bare markup for custom styling. */
export const Unstyled: Story = { args: { unstyled: true } };
