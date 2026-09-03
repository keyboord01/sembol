/**
 * Single source of truth for the docs.
 *
 * Every page is typed block data, and everything renders from it: the HTML
 * page, the "On this page" TOC, the per-page Markdown at /md/docs/<slug>,
 * llms.txt / llms-full.txt, and the search index. The human version and the
 * AI version can never drift because they are the same data.
 */

export type Block =
  | { t: "p"; md: string }
  | { t: "h2"; text: string }
  | { t: "h3"; text: string }
  | { t: "code"; lang: string; code: string; title?: string }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "callout"; kind: "info" | "warn"; md: string }
  | { t: "ul"; items: string[] };

export interface DocPage {
  slug: string; // "index" = /docs
  title: string;
  description: string;
  group: string;
  blocks: Block[];
}

export const SITE = "https://sembol.xyz";
export const GITHUB_URL = "https://github.com/keyboord01/sembol";
export const STORYBOOK_URL = "https://storybook.sembol.xyz";

export function headingId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

export const PAGES: DocPage[] = [
  {
    slug: "index",
    title: "Introduction",
    description:
      "Sembol is an open-source React library where Face ID becomes a self-custodial Stellar smart account. No seed phrases, no extensions.",
    group: "Start",
    blocks: [
      { t: "p", md: "**@sembol/passkey-react** gives your app real Stellar wallets with nothing to install and nothing to write down. A wallet is an [OpenZeppelin smart account](https://github.com/OpenZeppelin/stellar-contracts) contract on Stellar, owned by a passkey in the user's device. Your users tap Face ID; your code calls hooks." },
      { t: "callout", kind: "info", md: "**Proven, not promised.** This entire site, including [the wallet you can open right now](/wallet), runs on the public npm package. The full passkey journey passes end to end against live Stellar testnet in CI." },
      { t: "h2", text: "Why Sembol" },
      { t: "ul", items: [
        "**Self-custodial by construction**: the passkey never leaves the device's secure enclave, and the wallet is a contract the user owns on-chain. There is no server copy and no vendor custody.",
        "**No seed phrases**: passkeys sync through iCloud Keychain and Google Password Manager the way passwords already do.",
        "**Sponsored onboarding**: wallet creation rides a fee relayer, so users start with zero XLM.",
        "**Your brand, one prop**: a typed `theme` restyles every component. Try it in the [theme builder](/customize).",
        "**Recovery is on-chain**: backup signers, recovery credentials, and spending caps are enforced by the contract, not by an API.",
      ] },
      { t: "h2", text: "The stack" },
      { t: "table", head: ["Layer", "What it is"], rows: [
        ["Your app", "React, any bundler. Next.js and Vite both verified"],
        ["@sembol/passkey-react", "Provider, typed hooks, prebuilt themeable components (this library)"],
        ["smart-account-kit", "The official low-level Stellar SDK Sembol builds on"],
        ["OpenZeppelin contracts", "Audited smart account contracts on Stellar (RC v0.7.0 audit, April 2026)"],
      ] },
      { t: "h2", text: "Where to go next" },
      { t: "ul", items: [
        "[Quickstart](/docs/quickstart): a working wallet in one component.",
        "[Theming](/docs/theming): make it look like your product, not ours.",
        "[Live Storybook](" + "https://storybook.sembol.xyz" + "): every component, every state, interactive.",
      ] },
    ],
  },
  {
    slug: "quickstart",
    title: "Quickstart",
    description: "Install @sembol/passkey-react and ship a working Stellar passkey wallet in one component.",
    group: "Start",
    blocks: [
      { t: "h2", text: "Install" },
      { t: "code", lang: "bash", code: "npm install @sembol/passkey-react" },
      { t: "h2", text: "Wrap and render" },
      { t: "p", md: "One provider, one stylesheet import, and two components:" },
      { t: "code", lang: "tsx", title: "app.tsx", code: `import {
  PasskeyWalletProvider,
  CreateWalletButton,
  ConnectWalletButton,
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
}` },
      { t: "p", md: "That is a complete testnet wallet: create with Face ID, sponsored contract deployment, automatic session restore on reload. The provider is SSR safe, so it wraps a Next.js App Router tree directly." },
      { t: "h2", text: "Read state, send a payment" },
      { t: "code", lang: "tsx", code: `import {
  usePasskeyWallet,
  useWalletBalance,
  useTransfer,
} from "@sembol/passkey-react";

function Wallet() {
  const { isConnected, address } = usePasskeyWallet();
  const { formatted, symbol } = useWalletBalance();
  const { transfer, status } = useTransfer();

  if (!isConnected) return null;
  return (
    <>
      <p>{address}</p>
      <p>{formatted} {symbol}</p>
      <button
        onClick={() => transfer({ to: "G...", amount: "1" })}
        disabled={status === "transferring"}
      >
        Send 1 XLM
      </button>
    </>
  );
}` },
      { t: "h2", text: "Make it yours" },
      { t: "code", lang: "tsx", code: `<PasskeyWalletProvider
  config={SEMBOL_TESTNET_ARTIFACTS}
  theme={{ accent: "#e11d48", radius: "lg" }}
>` },
      { t: "p", md: "One `accent` retints every component. Build a full theme visually in the [theme builder](/customize) and copy the prop out, or read [Theming](/docs/theming) for the whole API." },
      { t: "callout", kind: "warn", md: "**Passkeys are per domain.** A wallet created on `localhost` will not appear on your production domain. Each domain gets its own passkeys, by WebAuthn design." },
    ],
  },
  {
    slug: "configuration",
    title: "Configuration",
    description: "SembolConfig fields, the testnet preset, relayer requirements, and environment overrides.",
    group: "Build",
    blocks: [
      { t: "p", md: "`SEMBOL_TESTNET_ARTIFACTS` is a complete, working testnet preset: RPC, network passphrase, the deployed contract hashes, and a public fee relayer. Spread it and override any field." },
      { t: "code", lang: "ts", code: `import { SEMBOL_TESTNET_ARTIFACTS, type SembolConfig } from "@sembol/passkey-react";

const config: SembolConfig = {
  ...SEMBOL_TESTNET_ARTIFACTS,
  appName: "My App",            // shown in the passkey prompt
  relayerUrl: process.env.NEXT_PUBLIC_RELAYER_URL
    ?? SEMBOL_TESTNET_ARTIFACTS.relayerUrl,
};` },
      { t: "h2", text: "Fields" },
      { t: "table", head: ["Field", "Purpose"], rows: [
        ["`rpcUrl`", "Soroban RPC endpoint"],
        ["`networkPassphrase`", "Stellar network. Drives explorer links and network display"],
        ["`accountWasmHash`", "Smart account contract wasm hash to deploy"],
        ["`webauthnVerifierAddress`", "On-chain secp256r1 verifier used by passkey signatures"],
        ["`ed25519VerifierAddress`", "Verifier for Ed25519 backup signers"],
        ["`spendingLimitPolicyAddress`", "Policy contract behind the spending limit feature"],
        ["`nativeTokenContract`", "XLM SAC address. Derived from the passphrase when omitted"],
        ["`relayerUrl`", "Fee relayer endpoint. **Required for wallet creation** since smart-account-kit 0.5.0"],
        ["`appName`", "Name in the passkey prompt. Defaults to \"Stellar App\""],
        ["`rpId`", "WebAuthn relying party id. Defaults to the current domain"],
        ["`webAuthnHints`", "Passkey UI ordering hints, e.g. `[\"client-device\", \"hybrid\"]`"],
      ] },
      { t: "h2", text: "The relayer requirement" },
      { t: "p", md: "Since smart-account-kit 0.5.0, the shared deployer is sign-only: **wallet creation must go through a fee relayer**, there is no RPC fallback. The testnet preset points at the public SDF relayer proxy, so testnet works with zero setup. Mainnet currently requires running your own relayer; Sembol Cloud, a hosted option, is in the works." },
      { t: "h2", text: "Session persistence" },
      { t: "p", md: "Sessions persist in IndexedDB by default, so a reload silently reconnects. Inject your own `storage` adapter or a prebuilt `kit` instance through the provider for tests and advanced setups." },
    ],
  },
  {
    slug: "components",
    title: "Components",
    description: "Prebuilt, themeable React components: provider, create, connect, balance, signing modal, signers, recovery, spending limits.",
    group: "Build",
    blocks: [
      { t: "p", md: "Every component ships styled by the default stylesheet, themeable through the [theme prop](/docs/theming), and escapable via `unstyled`. See each one live, in every state, in the [Storybook](" + "https://storybook.sembol.xyz" + ")." },
      { t: "h2", text: "PasskeyWalletProvider" },
      { t: "p", md: "The root. Builds the smart-account-kit instance, restores sessions, exposes everything to hooks, and applies your `theme`." },
      { t: "code", lang: "tsx", code: `<PasskeyWalletProvider config={config} theme={{ accent: "#0284c7" }}>
  {children}
</PasskeyWalletProvider>` },
      { t: "h2", text: "CreateWalletButton" },
      { t: "p", md: "The full creation ceremony behind one button: passkey registration, sponsored contract deployment, optional funding. Props: `label`, `nickname`, `fund`, `variant`, `size`, `unstyled`, `onCreated`, `onError`." },
      { t: "h2", text: "ConnectWalletButton" },
      { t: "p", md: "Connects or restores a wallet. Once connected it becomes an account chip with a menu: copy address, view on stellar.expert, switch wallet, disconnect. Props: `label`, `variant`, `size`, `unstyled`, `onConnected`, `onDisconnected`, `onError`." },
      { t: "h2", text: "WalletBalance" },
      { t: "p", md: "Live XLM balance with an optional refresh control and polling. Props: `pollInterval`, `showRefresh`, `unstyled`." },
      { t: "h2", text: "SignTransactionModal" },
      { t: "p", md: "Reviews and signs any `AssembledTransaction` with the passkey: human-readable summary, fee, network, then Face ID. Drive it with state:" },
      { t: "code", lang: "tsx", code: `const [tx, setTx] = useState<AssembledTransaction<unknown> | null>(null);

<SignTransactionModal
  open={tx !== null}
  transaction={tx}
  title="Approve payment"
  onClose={() => setTx(null)}
  onSuccess={({ hash }) => console.log(hash)}
/>` },
      { t: "h2", text: "Security components" },
      { t: "table", head: ["Component", "What it does"], rows: [
        ["`SignerList`", "Every signer on the account, with guarded removal"],
        ["`AddSignerButton`", "Add a backup passkey or an Ed25519 public key as a signer"],
        ["`RecoverySetup`", "Enroll recovery credentials, or run recovery on a new device (`mode=\"recover\"`)"],
        ["`SpendingPolicyForm`", "Set an on-chain spending limit per time window"],
      ] },
    ],
  },
  {
    slug: "hooks",
    title: "Hooks",
    description: "Headless typed hooks: wallet state, creation, connection, balance, transfers, signing, signers, recovery, spending policy.",
    group: "Build",
    blocks: [
      { t: "p", md: "Everything the components do is available headless. All hooks require a `PasskeyWalletProvider` above them." },
      { t: "h2", text: "usePasskeyWallet" },
      { t: "code", lang: "ts", code: `const {
  kit,          // the smart-account-kit instance
  status,       // "initializing" | "disconnected" | "connected" ...
  isConnected,
  address,      // C... contract address
  capabilities, // WebAuthn support detection
  config,       // resolved config incl. explorerBaseUrl
  connect, createWallet, disconnect, fund,
} = usePasskeyWallet();` },
      { t: "h2", text: "Flows" },
      { t: "table", head: ["Hook", "Returns"], rows: [
        ["`useCreateWallet()`", "`createWallet` with per-phase progress: `passkey`, `deploying`, `funding`"],
        ["`useConnectWallet()`", "`connect` with status"],
        ["`useTransfer()`", "`transfer({ to, amount })` building, signing, and submitting an XLM payment"],
        ["`useSignTransaction()`", "sign any `AssembledTransaction` with the passkey"],
        ["`useRecovery()`", "enroll and execute recovery"],
      ] },
      { t: "h2", text: "State" },
      { t: "table", head: ["Hook", "Returns"], rows: [
        ["`useWalletBalance()`", "`formatted`, `raw` stroops, `symbol`, `status`, `refetch`, `isRefreshing`"],
        ["`useWalletAddress()`", "`address`, `copy()` with `copied` feedback, `explorerUrl`"],
        ["`useSigners()`", "the signer list, live"],
        ["`useAddSigner()` / `useRemoveSigner()`", "signer mutations"],
        ["`useSpendingPolicy()`", "read and set the on-chain limit"],
      ] },
      { t: "h2", text: "Utilities" },
      { t: "code", lang: "ts", code: `import { buildTransferTransaction, toSembolError } from "@sembol/passkey-react";

// arbitrary token transfers (returns an AssembledTransaction for the modal)
const tx = await buildTransferTransaction(kit, {
  tokenContract: config.nativeTokenContract,
  to, amount,
});

// every thrown error normalizes to a typed SembolError
try { ... } catch (e) {
  toast(toSembolError(e).userMessage);
}` },
    ],
  },
  {
    slug: "theming",
    title: "Theming",
    description: "One typed theme prop restyles every component: accent derivation, 19 tokens per scheme, radius, fonts, presets, scoped themes, CSS variables.",
    group: "Style",
    blocks: [
      { t: "p", md: "Sembol should look like **your** product. One typed prop does it, and everything compiles down to CSS custom properties you can also set by hand." },
      { t: "code", lang: "tsx", code: `<PasskeyWalletProvider
  config={config}
  theme={{ accent: "#e11d48", radius: "lg", colorScheme: "auto" }}
>` },
      { t: "callout", kind: "info", md: "Build a theme visually in the [theme builder](/customize): live components, every control typed, and the exact prop generated for copy-paste." },
      { t: "h2", text: "The SembolTheme object" },
      { t: "table", head: ["Option", "Values"], rows: [
        ["`accent`", "Any CSS color. Hover, active, muted, and the focus ring derive from it per scheme via `color-mix()`"],
        ["`colors`", "Fine-grained overrides, 19 tokens: `bg`, `surface`, `surfaceHover`, `border`, `borderStrong`, `fg`, `fgMuted`, `onAccent`, `success*`, `danger*`, `overlay`, and the accent family"],
        ["`darkColors`", "Dark-scheme overrides, layered on top of `colors`"],
        ["`radius`", "`\"none\" | \"sm\" | \"md\" | \"lg\" | \"full\"` or a number in px"],
        ["`fonts`", "`{ body, mono }` CSS stacks"],
        ["`shadows`", "`false` for a flat UI"],
        ["`colorScheme`", "`\"light\" | \"dark\" | \"auto\"`; the provider manages `data-sembol-theme` for you"],
      ] },
      { t: "h2", text: "Presets" },
      { t: "code", lang: "tsx", code: `import { sembolThemes } from "@sembol/passkey-react";

<PasskeyWalletProvider theme={sembolThemes.seal} ... >     // gold on ink
<PasskeyWalletProvider theme={{ ...sembolThemes.ocean, radius: "full" }} ... >` },
      { t: "p", md: "Four ship today: `seal`, `ocean`, `forest`, `mono`. See them side by side in [Storybook: Theming/Presets](" + "https://storybook.sembol.xyz" + ")." },
      { t: "h2", text: "Scoped themes" },
      { t: "code", lang: "ts", code: `import { sembolThemeToCss } from "@sembol/passkey-react";

// theme only one subtree, e.g. an embedded checkout
const css = sembolThemeToCss({ accent: "#16a34a" }, ".checkout");` },
      { t: "h2", text: "Plain CSS" },
      { t: "p", md: "Every visual decision is a `--sembol-*` custom property. Override them after the stylesheet import and skip the prop entirely; dark mode is the `data-sembol-theme=\"dark\"` attribute, or the OS preference when the attribute is absent." },
      { t: "code", lang: "css", code: `:root {
  --sembol-color-accent: #e11d48;
  --sembol-radius: 6px;
  --sembol-font: "Inter", sans-serif;
}` },
    ],
  },
  {
    slug: "security",
    title: "Signers & recovery",
    description: "On-chain security: backup signers, recovery credentials, spending limits enforced by the smart account contract.",
    group: "Protect",
    blocks: [
      { t: "p", md: "A Sembol wallet is a contract, so security is on-chain and survives Sembol itself: extra signers, recovery, and spending caps are enforced by the smart account, not by an API someone could turn off." },
      { t: "h2", text: "Backup signers" },
      { t: "p", md: "Add a second passkey (another device) or an Ed25519 public key whose secret lives offline. `SignerList` + `AddSignerButton` cover the UI; `useSigners`, `useAddSigner`, `useRemoveSigner` are the headless path. The last signer cannot lock itself out through the UI." },
      { t: "h2", text: "Recovery" },
      { t: "p", md: "Enroll a recovery credential while the device is still in hand (`RecoverySetup`). To get back in later: open the app on any device and run `RecoverySetup mode=\"recover\"`, which is exactly what the [demo wallet's create page](/wallet) does under \"Lost your device?\"." },
      { t: "h2", text: "Spending limits" },
      { t: "p", md: "`SpendingPolicyForm` installs an on-chain policy capping XLM out per time window. Payments beyond the cap are rejected by the contract during auth, not by client code. Changing the window re-installs the policy and asks for two approvals." },
      { t: "callout", kind: "warn", md: "Enroll recovery **before** you need it. A passkey that only ever lived on one lost, unsynced device is gone; a recovery credential or second signer is the way back in." },
    ],
  },
  {
    slug: "headless",
    title: "Headless & advanced",
    description: "unstyled components, injectable WebAuthn and storage adapters, kit injection, React Native readiness.",
    group: "Advanced",
    blocks: [
      { t: "h2", text: "unstyled" },
      { t: "p", md: "Every component accepts `unstyled` to drop all `sembol-*` classes and render bare, accessible markup for your own CSS. Or skip the stylesheet entirely and compose the hooks." },
      { t: "h2", text: "Injectable adapters" },
      { t: "p", md: "The provider accepts injectable `webAuthn` functions (`startRegistration`, `startAuthentication`) and a `storage` adapter. These are the seams that make non-browser targets possible; React Native support is on the roadmap on exactly these hooks." },
      { t: "h2", text: "Kit injection" },
      { t: "code", lang: "tsx", code: `// tests and advanced setups: bring your own kit
<PasskeyWalletProvider config={config} kit={myPrebuiltKit}>` },
      { t: "h2", text: "Errors" },
      { t: "p", md: "All failures normalize to `SembolError` with a stable `code` and a human `userMessage`. `contractCodeFromMessage` maps raw Soroban errors when you need to go deeper." },
      { t: "h2", text: "Bundlers" },
      { t: "p", md: "Next.js (webpack and Turbopack) and Vite are both exercised: the library patches Next's Buffer polyfill gap automatically and stays inert under Vite, where it is not needed." },
    ],
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    description: "Passkeys per domain, iCloud passkeys in Chrome, relayer errors, Buffer polyfill, domain moves.",
    group: "Advanced",
    blocks: [
      { t: "table", head: ["Symptom", "Cause and fix"], rows: [
        ["Connect finds no passkey", "Passkeys are per domain. Create one on this domain first"],
        ["Chrome cannot see iCloud passkeys", "Enable \"Use passkeys and passwords from iCloud Keychain\" in `chrome://password-manager/settings`, or use Safari"],
        ["Wallet creation fails instantly", "A relayer is required since smart-account-kit 0.5.0. The testnet preset includes one; set `relayerUrl` for your own"],
        ["`readBigInt64BE is not a function`", "Old Next.js Buffer polyfill. Fixed automatically by this library since 0.3.1"],
        ["Wallets missing after a domain move", "Same per-domain rule: wallets follow the domain that created them"],
        ["Balance shows unavailable", "Testnet RPC hiccup. `refetch` from `useWalletBalance`, and check the RPC URL"],
      ] },
      { t: "h2", text: "Still stuck" },
      { t: "p", md: "[Open an issue](" + "https://github.com/keyboord01/sembol/issues" + ") with the `SembolError` code from `toSembolError(err).code`, or read the source, it is small on purpose." },
      { t: "h2", text: "For AI agents" },
      { t: "p", md: "These docs are machine-readable: [/llms.txt](/llms.txt) indexes every page, [/llms-full.txt](/llms-full.txt) is the whole documentation as one Markdown file, and every page is served as raw Markdown under `/md/docs/<slug>`." },
    ],
  },
];

export const GROUPS = ["Start", "Build", "Style", "Protect", "Advanced"];

export function pageBySlug(slug: string): DocPage | undefined {
  return PAGES.find((p) => p.slug === slug);
}

export function pagePath(p: DocPage): string {
  return p.slug === "index" ? "/docs" : `/docs/${p.slug}`;
}

export function prevNext(slug: string): { prev?: DocPage; next?: DocPage } {
  const i = PAGES.findIndex((p) => p.slug === slug);
  return { prev: PAGES[i - 1], next: PAGES[i + 1] };
}

export function toc(p: DocPage): { id: string; text: string; level: 2 | 3 }[] {
  return p.blocks.flatMap((b) =>
    b.t === "h2" || b.t === "h3"
      ? [{ id: headingId(b.text), text: b.text, level: b.t === "h2" ? (2 as const) : (3 as const) }]
      : [],
  );
}

/* ---------- markdown serialization (the AI-facing mirror) ---------- */

function stripLinksForCells(md: string): string {
  return md; // cells are already inline markdown
}

export function pageToMarkdown(p: DocPage): string {
  const out: string[] = [`# ${p.title}`, "", p.description, ""];
  for (const b of p.blocks) {
    switch (b.t) {
      case "p": out.push(b.md, ""); break;
      case "h2": out.push(`## ${b.text}`, ""); break;
      case "h3": out.push(`### ${b.text}`, ""); break;
      case "code": out.push("```" + b.lang + (b.title ? ` title="${b.title}"` : ""), b.code, "```", ""); break;
      case "ul": out.push(...b.items.map((i) => `- ${i}`), ""); break;
      case "callout": out.push(`> ${b.kind === "warn" ? "**Warning:** " : ""}${b.md}`, ""); break;
      case "table": {
        out.push(`| ${b.head.join(" | ")} |`);
        out.push(`| ${b.head.map(() => "---").join(" | ")} |`);
        for (const r of b.rows) out.push(`| ${r.map(stripLinksForCells).join(" | ")} |`);
        out.push("");
        break;
      }
    }
  }
  return out.join("\n").replace(/\]\(\//g, `](${SITE}/`);
}

export function llmsIndex(): string {
  const lines = [
    "# Sembol",
    "",
    "> Sembol (@sembol/passkey-react) is an open-source React library where Face ID becomes a self-custodial Stellar smart wallet: an audited OpenZeppelin smart account contract owned by a passkey in the user's device. No seed phrases, no extensions, sponsored fees, fully themeable UI. MIT licensed.",
    "",
    "Key facts: wallets are on-chain contracts (not custodial key shares); wallet creation requires a fee relayer (testnet preset includes one); theming is a typed prop compiling to --sembol-* CSS variables; every docs page below is also served as raw Markdown.",
    "",
    "## Docs",
    "",
    ...PAGES.map((p) => `- [${p.title}](${SITE}/md/docs/${p.slug}): ${p.description}`),
    "",
    "## Optional",
    "",
    `- [Full documentation as one file](${SITE}/llms-full.txt): all pages concatenated`,
    `- [Live demo wallet](${SITE}/wallet): create a real testnet wallet in the browser`,
    `- [Theme builder](${SITE}/customize): generates the theme prop interactively`,
    `- [Storybook](${STORYBOOK_URL}): every component and state, interactive`,
    `- [GitHub](${GITHUB_URL}): source, MIT`,
  ];
  return lines.join("\n") + "\n";
}

export function llmsFull(): string {
  return (
    `# Sembol documentation (@sembol/passkey-react)\n\n` +
    `Generated from the same source as ${SITE}/docs.\n\n` +
    PAGES.map((p) => pageToMarkdown(p)).join("\n\n---\n\n") +
    "\n"
  );
}

/* ---------- search index ---------- */

export interface SearchEntry {
  slug: string;
  page: string;
  heading: string; // "" for page root
  id: string;
  text: string;
}

export function searchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const p of PAGES) {
    let heading = "";
    let id = "";
    let buffer: string[] = [p.description];
    const flush = () => {
      entries.push({ slug: p.slug, page: p.title, heading, id, text: buffer.join(" ").slice(0, 300) });
      buffer = [];
    };
    for (const b of p.blocks) {
      if (b.t === "h2" || b.t === "h3") {
        flush();
        heading = b.text;
        id = headingId(b.text);
      } else if (b.t === "p" || b.t === "callout") buffer.push(b.md);
      else if (b.t === "ul") buffer.push(b.items.join(" "));
      else if (b.t === "table") buffer.push(b.rows.map((r) => r.join(" ")).join(" "));
      else if (b.t === "code") buffer.push(b.code.slice(0, 160));
    }
    flush();
  }
  return entries;
}
