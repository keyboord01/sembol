import type { Metadata } from "next";
import Link from "next/link";
import { SembolLogo, SembolMark } from "../../components/Brand";
import { ArrowUpRightIcon } from "../../components/icons";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Documentation for @sembol/passkey-react: install, provider setup, hooks, components, theming, recovery, and troubleshooting for Stellar passkey smart wallets.",
  alternates: { canonical: "/docs" },
};

const GITHUB_URL = "https://github.com/keyboord01/sembol";
const NPM_URL = "https://www.npmjs.com/package/@sembol/passkey-react";
const STORYBOOK_URL = "https://storybook.sembol.xyz";

const NAV = [
  ["getting-started", "Getting started"],
  ["configuration", "Configuration"],
  ["components", "Components"],
  ["hooks", "Hooks"],
  ["theming", "Theming"],
  ["security", "Signers & recovery"],
  ["headless", "Headless & advanced"],
  ["troubleshooting", "Troubleshooting"],
] as const;

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="tnum my-4 overflow-x-auto rounded-xl border border-hairline bg-surface p-4 font-mono text-[13px] leading-relaxed text-fg">
      <code>{children}</code>
    </pre>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="font-display mt-14 scroll-mt-24 border-b border-hairline/60 pb-3 text-2xl font-semibold tracking-wide uppercase first:mt-0"
    >
      {children}
    </h2>
  );
}

function Table({ rows, head }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-hairline">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-hairline bg-surface">
            <th className="px-4 py-2.5 font-medium">{head[0]}</th>
            <th className="px-4 py-2.5 font-medium">{head[1]}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline/60">
          {rows.map(([a, b]) => (
            <tr key={a}>
              <td className="px-4 py-2.5 font-mono text-[13px] whitespace-nowrap text-gold">{a}</td>
              <td className="px-4 py-2.5 text-dim">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-hairline/70 bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Sembol home">
            <SembolLogo />
          </Link>
          <nav className="flex items-center gap-6 text-sm text-dim" aria-label="Docs">
            <Link href="/customize" className="hidden transition-colors hover:text-fg sm:block">
              Theme builder
            </Link>
            <a
              href={STORYBOOK_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1 transition-colors hover:text-fg sm:inline-flex"
            >
              Storybook <ArrowUpRightIcon size={13} />
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-fg"
            >
              GitHub <ArrowUpRightIcon size={13} />
            </a>
            <Link href="/wallet" className="btn-gold btn-seal h-9 px-4 text-sm">
              Try it
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[210px_1fr]">
        {/* anchor nav */}
        <nav aria-label="On this page" className="top-24 hidden h-fit lg:sticky lg:block">
          <p className="microlabel text-gold">Docs</p>
          <ul className="mt-4 flex flex-col gap-1 border-l border-hairline/70 text-sm">
            {NAV.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="-ml-px block border-l border-transparent py-1.5 pl-4 text-dim transition-colors hover:border-gold hover:text-fg"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="min-w-0 max-w-3xl leading-relaxed text-dim [&_strong]:text-fg">
          <p className="microlabel text-gold">@sembol/passkey-react</p>
          <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight text-fg uppercase">
            Documentation
          </h1>
          <p className="mt-4">
            React components and headless hooks for Stellar passkey smart wallets. A wallet is
            an audited OpenZeppelin smart account contract on Stellar, owned by a passkey in
            the user&apos;s device. Built on the official{" "}
            <a href="https://github.com/stellar/smart-account-kit" className="text-gold hover:underline" target="_blank" rel="noreferrer">
              smart-account-kit
            </a>
            . MIT licensed.
          </p>

          <H2 id="getting-started">Getting started</H2>
          <Code>{`npm install @sembol/passkey-react`}</Code>
          <p>Wrap your app once, import the stylesheet once, and you are done:</p>
          <Code>{`import {
  PasskeyWalletProvider,
  ConnectWalletButton,
  CreateWalletButton,
  SEMBOL_TESTNET_ARTIFACTS,
} from "@sembol/passkey-react";
import "@sembol/passkey-react/styles.css";

export default function App() {
  return (
    <PasskeyWalletProvider config={SEMBOL_TESTNET_ARTIFACTS}>
      <CreateWalletButton />
      <ConnectWalletButton />
    </PasskeyWalletProvider>
  );
}`}</Code>
          <p>
            That is a working testnet wallet: create with Face ID, sponsored deployment,
            session restore on reload. Next.js App Router works out of the box, the provider
            is SSR safe.
          </p>

          <H2 id="configuration">Configuration</H2>
          <p>
            <strong>SEMBOL_TESTNET_ARTIFACTS</strong> is a complete testnet preset: RPC URL,
            network passphrase, the audited contract hashes, and a public fee relayer. Every
            field can be overridden:
          </p>
          <Table
            head={["Field", "Purpose"]}
            rows={[
              ["rpcUrl", "Soroban RPC endpoint"],
              ["networkPassphrase", "Stellar network (testnet or mainnet)"],
              ["accountWasmHash", "Smart account contract wasm hash"],
              ["relayerUrl", "Fee relayer. Required for wallet creation since smart-account-kit 0.5.0"],
              ["appName", "Shown in the passkey prompt"],
              ["rpId", "WebAuthn relying party, defaults to the current domain"],
              ["webAuthnHints", "Passkey UI hints, e.g. client-device first"],
            ]}
          />
          <p>
            Passkeys are per domain: a wallet created on localhost will not appear on your
            production domain.
          </p>

          <H2 id="components">Components</H2>
          <Table
            head={["Component", "What it does"]}
            rows={[
              ["PasskeyWalletProvider", "Context provider: kit instance, session, connection state, theme"],
              ["CreateWalletButton", "Full creation flow: passkey, deploy, optional funding"],
              ["ConnectWalletButton", "Connect or restore; becomes an account chip with menu when connected"],
              ["WalletBalance", "Live XLM balance with refresh"],
              ["SignTransactionModal", "Review and approve any AssembledTransaction with the passkey"],
              ["SignerList", "Every signer on the account, with removal"],
              ["AddSignerButton", "Add a backup passkey or Ed25519 signer"],
              ["RecoverySetup", "Enroll recovery credentials, or recover on a new device"],
              ["SpendingPolicyForm", "On-chain spending limit per time window"],
            ]}
          />
          <p>
            Every component accepts <code className="font-mono text-[13px] text-fg">unstyled</code>{" "}
            to drop the built-in classes entirely. Browse every state in the{" "}
            <a href={STORYBOOK_URL} className="text-gold hover:underline" target="_blank" rel="noreferrer">
              live Storybook
            </a>
            .
          </p>

          <H2 id="hooks">Hooks</H2>
          <Table
            head={["Hook", "Returns"]}
            rows={[
              ["usePasskeyWallet()", "kit, status, address, connect, createWallet, disconnect, fund, config"],
              ["useCreateWallet()", "createWallet with per-phase progress (passkey, deploying, funding)"],
              ["useConnectWallet()", "connect flow with status"],
              ["useWalletBalance()", "formatted balance, raw stroops, refetch"],
              ["useWalletAddress()", "address, copy with feedback, explorer URL"],
              ["useTransfer()", "build and submit an XLM transfer"],
              ["useSignTransaction()", "sign any AssembledTransaction with the passkey"],
              ["useSigners() / useAddSigner() / useRemoveSigner()", "signer management"],
              ["useSpendingPolicy()", "read and set the on-chain spending limit"],
              ["useRecovery()", "enroll and execute recovery"],
            ]}
          />
          <p>
            Utilities: <code className="font-mono text-[13px] text-fg">buildTransferTransaction</code>{" "}
            for arbitrary token transfers and{" "}
            <code className="font-mono text-[13px] text-fg">toSembolError</code> for typed errors
            with human-readable <code className="font-mono text-[13px] text-fg">userMessage</code>.
          </p>

          <H2 id="theming">Theming</H2>
          <p>One typed prop restyles every component. A single accent derives the rest:</p>
          <Code>{`<PasskeyWalletProvider
  config={config}
  theme={{ accent: "#e11d48", radius: "lg", colorScheme: "auto" }}
>`}</Code>
          <Table
            head={["Option", "Values"]}
            rows={[
              ["accent", "Any CSS color; hover, active, muted, and focus ring derive per scheme"],
              ["colors / darkColors", "19 tokens per scheme: bg, surface, border, fg, success, danger, overlay and more"],
              ["radius", "none, sm, md, lg, full, or a number in px"],
              ["fonts", "body and mono stacks"],
              ["shadows", "false for flat UIs"],
              ["colorScheme", "light, dark, or auto"],
            ]}
          />
          <p>
            Presets ship in <code className="font-mono text-[13px] text-fg">sembolThemes</code>{" "}
            (seal, ocean, forest, mono). Prefer CSS? Everything compiles to{" "}
            <code className="font-mono text-[13px] text-fg">--sembol-*</code> custom properties
            you can override by hand, and{" "}
            <code className="font-mono text-[13px] text-fg">sembolThemeToCss(theme, selector)</code>{" "}
            scopes a theme to one subtree. Build yours visually in the{" "}
            <Link href="/customize" className="text-gold hover:underline">
              theme builder
            </Link>{" "}
            and copy the config out.
          </p>

          <H2 id="security">Signers &amp; recovery</H2>
          <p>
            A Sembol wallet is a contract, so security is on-chain and composable: add extra
            passkey or Ed25519 signers, enroll a recovery credential while you still have the
            device, and cap spending per window with a policy the contract enforces. All of it
            is available as components (SignerList, AddSignerButton, RecoverySetup,
            SpendingPolicyForm) and hooks, and demonstrated on the{" "}
            <Link href="/security" className="text-gold hover:underline">
              Security page
            </Link>{" "}
            of the demo wallet.
          </p>

          <H2 id="headless">Headless &amp; advanced</H2>
          <p>
            Skip the stylesheet and build entirely on the hooks, or pass{" "}
            <code className="font-mono text-[13px] text-fg">unstyled</code> per component. The
            provider also accepts injectable WebAuthn functions and a storage adapter, the
            seams that make React Native support possible. A prebuilt{" "}
            <code className="font-mono text-[13px] text-fg">kit</code> instance can be injected
            for tests.
          </p>

          <H2 id="troubleshooting">Troubleshooting</H2>
          <Table
            head={["Symptom", "Cause and fix"]}
            rows={[
              ["Connect finds no passkey", "Passkeys are per domain. Create one on this domain first"],
              ["Chrome cannot see iCloud passkeys", "Enable iCloud Keychain in chrome://password-manager/settings, or use Safari"],
              ["Wallet creation fails instantly", "A relayer is required since kit 0.5.0. The testnet preset includes one; set relayerUrl for your own"],
              ["readBigInt64BE is not a function", "Old Next.js buffer polyfill. Fixed automatically by this library since 0.3.1"],
              ["Old wallets missing after domain move", "Same per-domain rule. Wallets follow the domain they were created on"],
            ]}
          />
          <p className="mt-6">
            Something else?{" "}
            <a href={`${GITHUB_URL}/issues`} className="text-gold hover:underline" target="_blank" rel="noreferrer">
              Open an issue
            </a>{" "}
            or read the source, it is small on purpose.
          </p>
        </article>
      </main>

      <footer className="border-t border-hairline/70">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-8">
          <Link href="/" className="microlabel inline-flex items-center gap-2 text-faint transition-colors hover:text-fg">
            <SembolMark size={12} className="text-gold/70" title="" />
            Sembol
          </Link>
          <nav className="flex gap-5 text-sm" aria-label="Docs footer">
            <a href={NPM_URL} target="_blank" rel="noreferrer" className="text-dim transition-colors hover:text-gold">npm</a>
            <a href={STORYBOOK_URL} target="_blank" rel="noreferrer" className="text-dim transition-colors hover:text-gold">Storybook</a>
            <Link href="/customize" className="text-dim transition-colors hover:text-gold">Theme builder</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
