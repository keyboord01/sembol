import Link from "next/link";
import { SembolLogo, SembolMark } from "../components/Brand";
import { ArrowUpRightIcon, FaceIdIcon } from "../components/icons";
import { CopyCommand } from "../components/landing/CopyCommand";
import { Girih } from "../components/landing/Girih";
import { HoldToSeal } from "../components/landing/HoldToSeal";
import { LaunchCta } from "../components/landing/LaunchCta";
import { LiveLedger } from "../components/landing/LiveLedger";
import { MainnetProof } from "../components/landing/MainnetProof";
import { Marquee } from "../components/landing/Marquee";
import { Reveal } from "../components/landing/Reveal";

const GITHUB_URL = "https://github.com/keyboord01/sembol";
const NPM_URL = "https://www.npmjs.com/package/@sembol/passkey-react";
const STORYBOOK_URL = "https://storybook.sembol.xyz";
const SITE_URL = "https://sembol.xyz";

/* Thin-stroke version of the mark for oversized watermark use. */
function BgStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className={className}>
      <g stroke="currentColor" strokeWidth="0.55" strokeLinejoin="round">
        <rect x="12.5" y="12.5" width="23" height="23" rx="1" />
        <rect x="12.5" y="12.5" width="23" height="23" rx="1" transform="rotate(45 24 24)" />
        <circle cx="24" cy="24" r="6.5" />
      </g>
      <circle cx="24" cy="24" r="1.2" fill="currentColor" />
    </svg>
  );
}

const RITUAL = [
  {
    n: "01",
    title: "Press",
    body: "Face ID makes a passkey inside your device's secure chip. It never leaves, it never syncs to a server, and there is nothing to write on paper. That is the whole ceremony.",
    artifact: (
      <div className="artifact-card">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/14 text-gold">
            <FaceIdIcon size={20} />
          </span>
          <span>
            <span className="block text-sm font-medium">Create a passkey</span>
            <span className="block text-xs text-faint">for sembol.xyz</span>
          </span>
        </div>
        <span className="btn-gold btn-seal h-9 w-full text-sm">Continue</span>
      </div>
    ),
  },
  {
    n: "02",
    title: "Seal",
    body: "Sembol deploys an OpenZeppelin smart account on Stellar and binds it to your passkey. A real contract, on a real chain, owned by you. Creation fees are sponsored, so you start from zero.",
    artifact: (
      <div className="artifact-card font-mono text-[13px] leading-relaxed">
        <p className="text-mint">✓ passkey created</p>
        <p className="text-mint">✓ smart account deployed</p>
        <p className="tnum truncate pl-4 text-faint">CBEIDTOK…QSLZP4</p>
        <p className="tnum text-mint">
          ✓ funded <span className="text-faint">· block 4,486,014</span>
        </p>
      </div>
    ),
  },
  {
    n: "03",
    title: "Spend",
    body: "Every payment shows you exactly what moves and asks for your face before it does. Lose the phone, keep the wallet: passkeys sync like passwords, and backup signers recover the rest.",
    artifact: (
      <div className="artifact-card">
        <p className="text-sm font-medium">Send 25 XLM</p>
        <p className="tnum font-mono text-xs text-faint">→ GBEK…2QLA · testnet</p>
        <span className="chip mt-2 self-start border-gold/40 text-gold">
          <FaceIdIcon size={13} />
          Sealed
        </span>
      </div>
    ),
  },
] as const;

const REGISTRY = [
  {
    code: "S-01",
    title: "Self-custodial, actually",
    body: "The key lives in the secure enclave and never leaves it. No server copy, no export button to phish.",
  },
  {
    code: "S-02",
    title: "Nothing to write down",
    body: "Passkeys sync through iCloud and Google the way your passwords already do.",
  },
  {
    code: "S-03",
    title: "Sponsored onboarding",
    body: "Wallet creation rides a fee relayer. New users start with zero XLM and zero setup.",
  },
  {
    code: "S-04",
    title: "Recovery built in",
    body: "Backup passkeys, recovery credentials, on-chain spending caps. A smart account, not a fragile keypair.",
  },
  {
    code: "S-05",
    title: "Your brand, not ours",
    body: "One typed theme prop restyles every component. Try the theme builder and take the config with you.",
  },
  {
    code: "S-06",
    title: "Open, audited bones",
    body: "MIT on top of OpenZeppelin's audited contracts and the official Stellar smart-account-kit.",
  },
] as const;

const FAQ = [
  {
    q: "Is Sembol self-custodial?",
    a: "Yes. The wallet is an OpenZeppelin smart account contract on Stellar, owned by a passkey that lives in your device's secure enclave. Sembol never holds keys and cannot move funds.",
  },
  {
    q: "What happens if I lose my phone?",
    a: "Passkeys sync through iCloud Keychain or Google Password Manager like your passwords do. You can also add backup passkeys and a recovery credential from the Security page, enforced by the contract on-chain.",
  },
  {
    q: "Do I need XLM or a browser extension to start?",
    a: "No. Wallet creation is sponsored by a fee relayer and runs in any modern browser with Face ID, Touch ID, or Windows Hello. On testnet you get free XLM instantly.",
  },
  {
    q: "Can I use Sembol in my own app?",
    a: "Yes. Install @sembol/passkey-react from npm: one provider, typed hooks, prebuilt components, and a theme prop that restyles everything to your brand. MIT licensed.",
  },
] as const;

function CodeSample() {
  const y = "text-gold";
  const b = "text-sky-400";
  const g = "text-mint";
  const p = "text-dim";
  return (
    <div className="relative lg:mt-10">
      <div className="overflow-hidden rounded-2xl border border-hairline bg-ink shadow-[0_24px_60px_rgb(20_16_4/0.18)]">
        <div className="flex items-center gap-2.5 border-b border-hairline/70 px-4 py-3">
          <SembolMark size={13} title="" className="text-gold/70" />
          <span className="microlabel text-faint">app.tsx</span>
        </div>
        <pre className="tnum overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-fg">
          <code>
            <span className={p}>import</span> {"{"}
            {"\n"}  PasskeyWalletProvider,{"\n"}  ConnectWalletButton,{"\n"}  SEMBOL_TESTNET_ARTIFACTS,{"\n"}
            {"}"} <span className={p}>from</span> <span className={g}>&quot;@sembol/passkey-react&quot;</span>;{"\n"}
            <span className={p}>import</span> <span className={g}>&quot;@sembol/passkey-react/styles.css&quot;</span>;{"\n\n"}
            <span className={p}>export default function</span> <span className={b}>App</span>() {"{"}
            {"\n"}  <span className={p}>return</span> ({"\n"}    <span className={y}>&lt;PasskeyWalletProvider</span>
            {"\n"}      config={"{"}SEMBOL_TESTNET_ARTIFACTS{"}"}
            {"\n"}      theme={"{{"} accent: <span className={g}>&quot;#e11d48&quot;</span>, radius: <span className={g}>&quot;lg&quot;</span> {"}}"}
            {"\n"}    <span className={y}>&gt;</span>
            {"\n"}      <span className={y}>&lt;ConnectWalletButton /&gt;</span>
            {"\n"}    <span className={y}>&lt;/PasskeyWalletProvider&gt;</span>
            {"\n"}  );{"\n"}
            {"}"}
          </code>
        </pre>
      </div>
    </div>
  );
}

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Sembol",
      url: SITE_URL,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      description:
        "Sembol turns Face ID into a self-custodial Stellar smart wallet. No seed phrases, no extensions. Open-source React library with a themeable wallet UI.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      license: "https://opensource.org/licenses/MIT",
      sameAs: [GITHUB_URL, NPM_URL],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="grain flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ---------- header ---------- */}
      <header className="sticky top-0 z-40 border-b border-hairline/70 bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Sembol home">
            <SembolLogo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-dim md:flex" aria-label="Landing">
            <a href="#ritual" className="transition-colors hover:text-fg">The ritual</a>
            <a href="#registry" className="transition-colors hover:text-fg">Registry</a>
            <Link href="/docs" className="transition-colors hover:text-fg">Docs</Link>
            <Link href="/customize" className="transition-colors hover:text-fg">Theme builder</Link>
            <a
              href={STORYBOOK_URL}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-fg"
            >
              Storybook
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-fg"
            >
              GitHub <ArrowUpRightIcon size={13} />
            </a>
          </nav>
          <LaunchCta size="sm" label="Open the app" className="btn-seal" />
        </div>
      </header>

      <main className="flex-1">
        {/* ---------- hero (ink) ---------- */}
        <section className="relative overflow-hidden">
          <BgStar className="spin-slow pointer-events-none absolute top-[-8rem] right-[-16rem] h-[36rem] w-[36rem] text-gold/[0.17] sm:top-[-3rem] sm:right-[-11rem] sm:h-[56rem] sm:w-[56rem]" />
          <div aria-hidden className="glow-gold absolute inset-0" />

          <div className="relative mx-auto w-full max-w-6xl px-5 pt-16 pb-24 sm:px-8 sm:pt-24 sm:pb-32">
            <div className="fade-up mb-8 flex flex-wrap items-center gap-2">
              <span className="chip border-gold/35 bg-gold/8 text-[13px] text-gold">
                <SembolMark size={12} title="" />
                Stellar Instawards winner
              </span>
              <span className="chip border-mint/35 bg-mint/8 text-[13px] text-mint">
                <span aria-hidden className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-mint" />
                Live on Stellar mainnet
              </span>
            </div>

            {/* dictionary entry */}
            <div className="fade-up fade-up-1 max-w-md border-l-2 border-gold/50 pl-4 font-mono text-sm leading-relaxed text-dim">
              <p>
                <span className="font-semibold text-fg">sem·bol</span>{" "}
                <span className="text-faint">/semˈbol/ · noun, Turkish</span>
              </p>
              <p>
                <span className="text-faint">1.</span> symbol; a mark that stands for its owner
              </p>
              <p>
                <span className="text-faint">2.</span>{" "}
                <span className="text-gold">a wallet that is you</span>
              </p>
            </div>

            <h1 className="font-display fade-up fade-up-2 mt-10 leading-[0.95] font-semibold tracking-tight uppercase">
              <span className="block text-6xl sm:text-8xl lg:text-[7.6rem]">The wallet</span>
              <span className="text-outline-gold block text-6xl sm:text-8xl lg:text-[7.6rem]">
                is you.
              </span>
            </h1>

            <p className="fade-up fade-up-3 mt-8 max-w-md text-lg leading-relaxed text-dim">
              A passkey is your seal. Sembol presses it into Stellar: a self-custodial smart
              account you open with your face, not a phrase on paper.
            </p>

            <div className="fade-up fade-up-4 mt-10 flex flex-wrap items-center gap-x-12 gap-y-6">
              <HoldToSeal />
              <a href="#developers" className="btn-ghost h-12 px-6 text-[15px]">
                For developers
              </a>
            </div>
          </div>
        </section>

        {/* ---------- paper chapter ---------- */}
        <Marquee />

        <div className="bg-paper text-ink">
          {/* proof of life */}
          <section aria-label="Live network" className="relative overflow-hidden">
            <span className="pointer-events-none absolute top-1/2 right-[-7rem] hidden -translate-y-1/2 lg:block">
              <BgStar className="spin-slow h-[30rem] w-[30rem] text-brass/[0.16]" />
            </span>
            <div className="relative mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
              <Reveal>
                <p className="microlabel text-brass">Proof of life</p>
                <h2 className="mt-3 max-w-md text-lg text-paper-dim">
                  This page is reading Stellar <span className="font-medium text-ink">right now</span>,
                  through the same connection your wallet would use.
                </h2>
                <div className="mt-8">
                  <LiveLedger tone="paper" />
                </div>
                <MainnetProof />
              </Reveal>
            </div>
          </section>

          <Girih id="a" className="text-brass/[0.14]" />

          {/* the ritual */}
          <section id="ritual" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24">
            <Reveal>
              <p className="microlabel text-brass">The ritual</p>
              <h2 className="font-display mt-4 max-w-xl text-3xl leading-tight font-semibold tracking-tight uppercase sm:text-5xl">
                Thirty seconds,
                <br />
                three gestures
              </h2>
            </Reveal>
            <div className="mt-6">
              {RITUAL.map(({ n, title, body, artifact }) => (
                <Reveal key={n}>
                  <div className="grid grid-cols-1 items-center gap-x-10 gap-y-6 border-b border-paper-line py-12 md:grid-cols-[8rem_1fr_300px]">
                    <p
                      aria-hidden
                      className="font-display text-7xl leading-none font-semibold text-brass/25 sm:text-8xl"
                    >
                      {n}
                    </p>
                    <div>
                      <h3 className="font-display text-2xl font-semibold tracking-wide uppercase">
                        {title}
                      </h3>
                      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-paper-dim">
                        {body}
                      </p>
                    </div>
                    <div className="justify-self-start md:justify-self-end">{artifact}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        </div>

        {/* ---------- the registry (ink) ---------- */}
        <section id="registry" className="border-t border-hairline/70">
          <div className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24">
            <Reveal>
              <p className="microlabel text-gold">The registry</p>
              <h2 className="font-display mt-4 max-w-2xl text-3xl leading-tight font-semibold tracking-tight uppercase sm:text-5xl">
                What is written here
              </h2>
              <p className="mt-4 max-w-lg text-base text-dim">
                Seed phrases lose more people than hackers do. Every entry below removes a
                reason to quit without giving up ownership.
              </p>
            </Reveal>
            <div className="mt-10">
              {REGISTRY.map(({ code, title, body }, index) => (
                <Reveal key={code} delay={index * 40}>
                  <div className="group grid grid-cols-1 items-baseline gap-x-8 gap-y-1 border-b border-hairline/60 py-5 transition-colors hover:bg-raised/40 sm:grid-cols-[5rem_minmax(0,17rem)_1fr_auto] sm:py-6">
                    <span className="microlabel tnum text-gold/70">{code}</span>
                    <h3 className="font-display text-lg font-semibold tracking-wide uppercase">
                      {title}
                    </h3>
                    <p className="text-sm leading-relaxed text-dim">{body}</p>
                    <SembolMark
                      size={16}
                      title=""
                      className="hidden self-center text-gold/25 transition-colors duration-300 group-hover:text-gold sm:block"
                    />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- developers (paper) ---------- */}
        <div className="bg-paper text-ink">
          <section id="developers" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
              <Reveal>
                <p className="microlabel text-brass">For developers</p>
                <h2 className="font-display mt-4 text-3xl leading-tight font-semibold tracking-tight uppercase sm:text-5xl">
                  One import, one seal
                </h2>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-paper-dim">
                  One provider and a set of typed hooks give you create, connect, send, signers,
                  recovery, and spending limits. Restyle everything from a single theme prop and
                  ship a wallet in an afternoon. This whole site is the proof.
                </p>
                <ul className="mt-7 flex flex-col gap-3.5 text-[15px]">
                  {[
                    "TypeScript-first hooks and prebuilt components",
                    "Your brand from one typed prop: an accent, a radius, done",
                    "Injectable WebAuthn and storage adapters, React Native ready",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-3 text-paper-dim">
                      <SembolMark size={13} className="mt-1.5 shrink-0 text-brass" title="" />
                      {line}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <CopyCommand command="npm install @sembol/passkey-react" />
                  <Link href="/customize" className="btn-gold btn-seal h-11 px-5 text-sm">
                    Open the theme builder
                  </Link>
                </div>
                <div className="mt-5 flex flex-wrap gap-5 text-sm">
                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-paper-dim transition-colors hover:text-brass"
                  >
                    Source on GitHub <ArrowUpRightIcon size={14} />
                  </a>
                  <a
                    href={NPM_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-paper-dim transition-colors hover:text-brass"
                  >
                    @sembol/passkey-react on npm <ArrowUpRightIcon size={14} />
                  </a>
                  <a
                    href={STORYBOOK_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-paper-dim transition-colors hover:text-brass"
                  >
                    Every component in the live Storybook <ArrowUpRightIcon size={14} />
                  </a>
                </div>
              </Reveal>
              <Reveal delay={120} className="min-w-0">
                <CodeSample />
              </Reveal>
            </div>
          </section>
        </div>

        {/* ---------- next + faq (ink) ---------- */}
        <section aria-label="Roadmap" className="border-t border-hairline/70">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
            <Reveal>
              <p className="microlabel text-gold">Next decrees</p>
              <div className="mt-6 flex flex-col divide-y divide-hairline/60">
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-4">
                  <h3 className="font-display text-lg font-semibold tracking-wide uppercase">
                    Sembol Cloud
                  </h3>
                  <p className="text-sm text-dim">
                    Sponsored fees as a service: project keys, prepaid budgets, capped floats.
                    Sponsoring on mainnet today.
                  </p>
                  <span className="chip ml-auto text-xs">live · v0</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-4">
                  <h3 className="font-display text-lg font-semibold tracking-wide uppercase">
                    <a
                      href="https://kumbara.sembol.xyz"
                      target="_blank"
                      rel="noreferrer"
                      className="transition-colors hover:text-gold"
                    >
                      Kumbara
                    </a>
                  </h3>
                  <p className="text-sm text-dim">
                    The front door to crypto: local currency in through an anchor, dollars in a wallet
                    only you hold, send and receive like any wallet. One market first, then every
                    market with a mainnet anchor.
                  </p>
                  <span className="chip ml-auto text-xs">live · testnet</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-4">
                  <h3 className="font-display text-lg font-semibold tracking-wide uppercase">
                    Receive from anywhere
                  </h3>
                  <p className="text-sm text-dim">
                    A plain Stellar address for every smart wallet, so money from an exchange or any
                    wallet lands in yours.
                  </p>
                  <span className="chip ml-auto text-xs">next</span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section aria-label="Frequently asked questions" className="border-t border-hairline/70">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
            <Reveal>
              <p className="microlabel text-gold">Questions</p>
              <div className="mt-6 flex max-w-2xl flex-col divide-y divide-hairline/60">
                {FAQ.map(({ q, a }) => (
                  <details key={q} className="group py-4">
                    <summary className="cursor-pointer list-none text-[15px] font-medium transition-colors hover:text-gold">
                      {q}
                    </summary>
                    <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-dim">{a}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <Girih id="b" className="text-gold/[0.09]" />

        {/* ---------- final seal ---------- */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="glow-gold absolute inset-0" />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start px-5 py-24 sm:items-center sm:px-8 sm:py-32 sm:text-center">
            <Reveal className="flex flex-col items-start sm:items-center">
              <h2 className="font-display max-w-3xl text-4xl leading-[1.02] font-semibold tracking-tight uppercase sm:text-6xl">
                Press your mark<span className="text-gold">.</span>
              </h2>
              <p className="mt-5 max-w-md text-base text-dim">
                A wallet with your face on it, free test XLM in it, and your first payment out
                of it. Half a minute, in this browser.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <LaunchCta label="Create your wallet" className="btn-seal" />
                <a
                  href={STORYBOOK_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost h-13 px-7 text-base"
                >
                  Browse the Storybook
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ---------- footer ---------- */}
      <footer className="overflow-hidden border-t border-hairline/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 pt-12 sm:px-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <SembolLogo />
            <p className="mt-4 text-sm leading-relaxed text-dim">
              Passkey wallets for Stellar. From developers to developers, funded through the Stellar
              Instawards program.
            </p>
            <p className="microlabel mt-5 text-faint">MIT · © 2026 Sembol contributors</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-16 gap-y-2.5 text-sm">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="text-dim transition-colors hover:text-fg">GitHub</a>
            <a href="https://stellar.org" target="_blank" rel="noreferrer" className="text-dim transition-colors hover:text-fg">Stellar</a>
            <a href={NPM_URL} target="_blank" rel="noreferrer" className="text-dim transition-colors hover:text-fg">npm</a>
            <a href="https://github.com/stellar/smart-account-kit" target="_blank" rel="noreferrer" className="text-dim transition-colors hover:text-fg">smart-account-kit</a>
            <Link href="/docs" className="text-dim transition-colors hover:text-fg">Docs</Link>
            <Link href="/wallet" className="text-dim transition-colors hover:text-fg">Live demo</Link>
            <Link href="/customize" className="text-dim transition-colors hover:text-fg">Theme builder</Link>
            <a href={STORYBOOK_URL} target="_blank" rel="noreferrer" className="text-dim transition-colors hover:text-fg">Storybook</a>
            <a href="https://openzeppelin.com" target="_blank" rel="noreferrer" className="text-dim transition-colors hover:text-fg">OpenZeppelin</a>
          </nav>
        </div>
        <p
          aria-hidden
          className="text-outline-faint font-display mx-auto -mb-[0.16em] w-full max-w-6xl px-5 text-center text-[19vw] leading-none font-semibold tracking-tight uppercase select-none sm:px-8 md:text-[13rem]"
        >
          Sembol
        </p>
      </footer>
    </div>
  );
}
