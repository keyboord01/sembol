import type { Metadata } from "next";
import Link from "next/link";
import { readUsage, type ProjectUsage } from "../../lib/usage";
import { EXPLORER, TESTNET_RESET } from "../../lib/usage-accounts";
import { SembolMark } from "../../components/Brand";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Usage",
  description:
    "Wallets created and transactions sponsored by Sembol Cloud, counted on-chain, per project, on mainnet and testnet.",
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="microlabel text-brass">{label}</p>
      <p className="font-display tnum mt-3 text-5xl leading-none font-semibold tracking-tight sm:text-6xl">
        {value}
      </p>
      {sub ? <p className="mt-2 text-sm text-paper-dim">{sub}</p> : null}
    </div>
  );
}

function ProjectRow({ p }: { p: ProjectUsage }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-2 border-b border-paper-line py-5 sm:grid-cols-[1fr_auto_auto_auto]">
      <div>
        <p className="font-display text-lg font-semibold tracking-wide uppercase">{p.label}</p>
        {p.note ? <p className="mt-1 text-sm text-paper-dim">{p.note}</p> : null}
        <p className="microlabel mt-2 text-paper-dim">
          {p.network} · {p.accounts} sponsor {p.accounts === 1 ? "account" : "accounts"}
          {p.fromFloor ? " · includes preserved history" : ""}
          {p.treasuryTransfers > 0
            ? ` · ${p.treasuryTransfers} treasury ${p.treasuryTransfers === 1 ? "transfer" : "transfers"} excluded`
            : ""}
          {p.truncated ? " · counts capped, may understate" : ""}
        </p>
      </div>
      <p className="tnum font-mono text-sm">
        <span className="text-paper-dim">wallets </span>
        <span className="text-ink">{p.walletsCreated}</span>
      </p>
      <p className="tnum font-mono text-sm">
        <span className="text-paper-dim">sponsored </span>
        <span className="text-ink">{p.transactionsSponsored}</span>
      </p>
      <p className="tnum font-mono text-sm">
        <span className="text-paper-dim">float </span>
        <span className="text-ink">{p.xlmRemaining.toFixed(1)} XLM</span>
      </p>
    </div>
  );
}

export default async function StatsPage() {
  const usage = await readUsage();
  const { totals } = usage;
  const mainnet = usage.projects.filter((p) => p.network === "mainnet");
  const testnet = usage.projects.filter((p) => p.network === "testnet");

  return (
    <div className="grain flex min-h-screen flex-col bg-paper text-ink">
      <header className="border-b border-paper-line">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Sembol home" className="inline-flex items-center gap-2.5">
            <SembolMark size={20} className="text-brass" />
            <span className="font-display text-lg font-semibold tracking-[0.14em] text-ink uppercase">
              Sembol
            </span>
          </Link>
          <Link href="/docs" className="text-sm text-paper-dim transition-colors hover:text-ink">
            Docs
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-16 sm:px-8 sm:py-20">
        <p className="microlabel text-brass">Sembol Cloud</p>
        <h1 className="font-display mt-4 max-w-2xl text-4xl leading-tight font-semibold tracking-tight uppercase sm:text-6xl">
          Wallets we paid for
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-paper-dim">
          Every wallet below was created without its owner holding any XLM, because Sembol Cloud paid
          the fee. These numbers are counted directly from the chain: each project sponsors from its
          own accounts, so the ledger itself is the record.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-10 border-t border-paper-line pt-10 sm:grid-cols-3">
          <Stat
            label="Wallets created"
            value={totals.walletsCreated.toLocaleString("en-US")}
            sub={`${totals.byNetwork.mainnet.walletsCreated} on mainnet · ${totals.byNetwork.testnet.walletsCreated} on testnet`}
          />
          <Stat
            label="Transactions sponsored"
            value={totals.transactionsSponsored.toLocaleString("en-US")}
            sub="creations and wallet use, fees paid by Sembol"
          />
          <Stat
            label="Spent on fees"
            value={`${totals.xlmSpent.toFixed(2)}`}
            sub="XLM, across every project"
          />
        </div>

        {mainnet.length > 0 ? (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">Mainnet</h2>
            <p className="mt-2 max-w-lg text-sm text-paper-dim">
              The public network, on the audited OpenZeppelin smart-account contracts. Sembol deploys
              no contracts of its own.
            </p>
            <div className="mt-6">
              {mainnet.map((p) => (
                <ProjectRow key={p.key} p={p} />
              ))}
            </div>
          </section>
        ) : null}

        {testnet.length > 0 ? (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">Testnet</h2>
            <p className="mt-2 max-w-xl text-sm text-paper-dim">
              Where the reference app and event onboarding run. Stellar resets testnet{" "}
              {TESTNET_RESET.cadence}, which clears its whole history — so a figure here can fall to
              zero without a single wallet being lost.{" "}
              {TESTNET_RESET.next ? (
                <>
                  The next reset is{" "}
                  <span className="text-ink">
                    {new Date(TESTNET_RESET.next).toUTCString().replace(":00 GMT", " UTC")}
                  </span>
                  . Figures we want to keep past it are marked as preserved.
                </>
              ) : (
                <>No reset is currently scheduled.</>
              )}
            </p>
            <div className="mt-6">
              {testnet.map((p) => (
                <ProjectRow key={p.key} p={p} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-16 border-t border-paper-line pt-10">
          <p className="microlabel text-brass">How this is counted</p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper-dim">
            A wallet creation is a contract deployment paid for by one of the sponsor accounts below;
            a sponsored transaction is any other use of a wallet whose fee Sembol paid. Nothing here
            comes from an analytics service. You can verify every figure yourself on a block explorer.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {usage.projects.map((p) => (
              <a
                key={p.key}
                href={`${EXPLORER[p.network]}/account/${p.sampleAccount}`}
                className="chip text-xs"
                aria-label={`${p.label} on the explorer`}
              >
                {p.label}
              </a>
            ))}
          </div>
          <p className="microlabel mt-8 text-paper-dim">
            Checked {new Date(usage.checkedAt).toUTCString()} · machine-readable at{" "}
            <Link href="/api/usage" className="underline underline-offset-4">
              /api/usage
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
