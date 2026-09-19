/**
 * Sembol Cloud usage, read from the chain.
 *
 * A sponsored wallet creation is an invoke_host_function whose function is
 * CreateContractV2; any other successful invoke_host_function is a sponsored
 * use of a wallet. Because each project sponsors from its own accounts, the
 * operations feed of those accounts is a per-project usage ledger.
 *
 * Testnet caveat: Stellar testnet resets periodically and Horizon history goes
 * with it. `floor` values are a persisted high-water mark so a reset cannot
 * erase numbers we have already reported. See USAGE_FLOOR below.
 */
import { HORIZON, USAGE_PROJECTS, type UsageNetwork, type UsageProject } from "./usage-accounts";

const PAGE_LIMIT = 200;
const MAX_PAGES = 10; // 2,000 operations per account before we flag truncation
const REVALIDATE_SECONDS = 60;

export interface ProjectUsage {
  key: string;
  label: string;
  network: UsageNetwork;
  note?: string;
  walletsCreated: number;
  transactionsSponsored: number;
  xlmSpent: number;
  xlmRemaining: number;
  accounts: number;
  /** Transfers where the sponsor moved its own funds - not sponsorship. */
  treasuryTransfers: number;
  /** True when we hit the pagination cap and counts may understate. */
  truncated: boolean;
  /** First sponsor account, for an explorer link. */
  sampleAccount: string;
  /** True when a reported number came from the persisted floor, not the chain. */
  fromFloor: boolean;
}

export interface UsageSnapshot {
  projects: ProjectUsage[];
  totals: {
    walletsCreated: number;
    transactionsSponsored: number;
    xlmSpent: number;
    byNetwork: Record<UsageNetwork, { walletsCreated: number; transactionsSponsored: number }>;
  };
  checkedAt: string;
}

/**
 * High-water marks. Stellar testnet resets wipe Horizon history, so numbers we
 * have already published must not silently drop to zero. Raise these when a
 * milestone is worth preserving (they are floors, never ceilings).
 */
const USAGE_FLOOR: Record<string, { walletsCreated: number; transactionsSponsored: number }> = {
  // "sembol-event": { walletsCreated: 0, transactionsSponsored: 0 },
};

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Walk a Horizon collection, following `next` until exhausted or capped. */
async function collect(firstUrl: string): Promise<{ records: Record<string, unknown>[]; truncated: boolean }> {
  const records: Record<string, unknown>[] = [];
  let url: string | null = firstUrl;
  for (let page = 0; page < MAX_PAGES && url; page++) {
    const body = await getJson(url);
    const batch = ((body?._embedded as { records?: Record<string, unknown>[] })?.records ?? []) as Record<string, unknown>[];
    records.push(...batch);
    if (batch.length < PAGE_LIMIT) return { records, truncated: false };
    const links = body?._links as { next?: { href?: string } } | undefined;
    url = links?.next?.href ?? null;
  }
  return { records, truncated: Boolean(url) };
}

async function readAccount(horizon: string, account: string) {
  const [opsResult, txResult, acct] = await Promise.all([
    collect(`${horizon}/accounts/${account}/operations?limit=${PAGE_LIMIT}&order=asc`),
    collect(`${horizon}/accounts/${account}/transactions?limit=${PAGE_LIMIT}&order=asc`),
    getJson(`${horizon}/accounts/${account}`),
  ]);

  const ops = opsResult.records;
  let walletsCreated = 0;
  let transactionsSponsored = 0;
  let treasuryTransfers = 0;
  for (const op of ops) {
    if (op.type !== "invoke_host_function" || op.transaction_successful !== true) continue;
    const fn = String(op.function ?? "");
    if (fn.endsWith("CreateContractV2")) {
      walletsCreated++;
      continue;
    }
    if (!fn.endsWith("InvokeContract")) continue;
    // A sponsored transaction moves someone else's value and we pay the fee.
    // When the sponsor account itself is the source of a transfer, that is the
    // treasury moving its own money (funding a wallet), not sponsorship.
    const changes = (op.asset_balance_changes ?? []) as { from?: string }[];
    const sponsorSpentOwnFunds = changes.some((c) => c.from === account);
    if (sponsorSpentOwnFunds) treasuryTransfers++;
    else transactionsSponsored++;
  }

  const txs = txResult.records;
  const feeStroops = txs.reduce((sum, tx) => sum + Number(tx.fee_charged ?? 0), 0);

  const balances = (acct?.balances ?? []) as { asset_type?: string; balance?: string }[];
  const native = balances.find((b) => b.asset_type === "native");

  return {
    walletsCreated,
    // a creation is also a transaction whose fee we paid
    transactionsSponsored: transactionsSponsored + walletsCreated,
    treasuryTransfers,
    xlmSpent: feeStroops / 1e7,
    xlmRemaining: Number(native?.balance ?? 0),
    truncated: opsResult.truncated || txResult.truncated,
    reachable: acct !== null,
  };
}

async function readProject(project: UsageProject): Promise<ProjectUsage> {
  const horizon = HORIZON[project.network];
  const results = await Promise.all(project.accounts.map((a) => readAccount(horizon, a)));

  let walletsCreated = results.reduce((s, r) => s + r.walletsCreated, 0);
  let transactionsSponsored = results.reduce((s, r) => s + r.transactionsSponsored, 0);

  const floor = USAGE_FLOOR[project.key];
  let fromFloor = false;
  if (floor) {
    if (floor.walletsCreated > walletsCreated) {
      walletsCreated = floor.walletsCreated;
      fromFloor = true;
    }
    if (floor.transactionsSponsored > transactionsSponsored) {
      transactionsSponsored = floor.transactionsSponsored;
      fromFloor = true;
    }
  }

  return {
    key: project.key,
    label: project.label,
    network: project.network,
    note: project.note,
    walletsCreated,
    transactionsSponsored,
    xlmSpent: results.reduce((s, r) => s + r.xlmSpent, 0),
    xlmRemaining: results.reduce((s, r) => s + r.xlmRemaining, 0),
    treasuryTransfers: results.reduce((s, r) => s + r.treasuryTransfers, 0),
    truncated: results.some((r) => r.truncated),
    accounts: project.accounts.length,
    sampleAccount: project.accounts[0] ?? "",
    fromFloor,
  };
}

export async function readUsage(): Promise<UsageSnapshot> {
  const projects = await Promise.all(USAGE_PROJECTS.map(readProject));
  const byNetwork: UsageSnapshot["totals"]["byNetwork"] = {
    mainnet: { walletsCreated: 0, transactionsSponsored: 0 },
    testnet: { walletsCreated: 0, transactionsSponsored: 0 },
  };
  for (const p of projects) {
    byNetwork[p.network].walletsCreated += p.walletsCreated;
    byNetwork[p.network].transactionsSponsored += p.transactionsSponsored;
  }
  return {
    projects,
    totals: {
      walletsCreated: projects.reduce((s, p) => s + p.walletsCreated, 0),
      transactionsSponsored: projects.reduce((s, p) => s + p.transactionsSponsored, 0),
      xlmSpent: projects.reduce((s, p) => s + p.xlmSpent, 0),
      byNetwork,
    },
    checkedAt: new Date().toISOString(),
  };
}
