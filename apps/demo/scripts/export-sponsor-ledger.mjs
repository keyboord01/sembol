/**
 * Sembol Cloud fee-budget ledger, per project key, as CSV.
 *
 * Every project sponsors from its own channel accounts, so each account's
 * transaction history on Horizon is that project's fee ledger. This walks it
 * and writes one row per transaction the account paid for, with a running
 * total of XLM spent against the project's float. Public keys only: no secrets
 * needed, and anyone can re-run it and get the same numbers.
 *
 * Rows carry the transaction hash (so every line can be checked on
 * stellar.expert) but no wallet addresses.
 *
 *   node scripts/export-sponsor-ledger.mjs > sponsor-ledger.csv
 *   node scripts/export-sponsor-ledger.mjs --project sembol-event --from 2026-09-19 --to 2026-09-21
 */

const PROJECTS = [
  {
    key: "sembol-mainnet",
    network: "mainnet",
    accounts: ["GBWUM6U4HSTM4CCD6APKROCJPJXBRQTRE67A37ERI424N3AW4DAUDWLS"],
  },
  {
    key: "sembol-app",
    network: "testnet",
    accounts: [
      "GDNUAHNI4EUZOJDI2Q64JIFXQPY6FTHA54B4L3TPCO2FRHCKTVAWN5KY",
      "GD2QWLQE7IJR6C7CDTEKHCXHNHX6RHAIG4Y5UVK2TBKTLSBZUHMFHXCY",
      "GAPJHN7FB5MOSBX36WAOCT4CPX4Q7ODRX7HD3N54ZVE35ONVFQ6NA2UH",
    ],
  },
  {
    key: "sembol-event",
    network: "testnet",
    accounts: [
      "GBMA3AUXX3EZDVVXFG25HBB6TLZTHC4RFUSAYYHB6RCUUVMMJ235MGYZ",
      "GD26J5WHM5ZHLD6LQR7VB2MAYVAR3AFI6Q5JODIZXKZDUPYCY6W4TZYD",
    ],
  },
];

const HORIZON = {
  mainnet: "https://horizon.stellar.org",
  testnet: "https://horizon-testnet.stellar.org",
};
const EXPLORER = {
  mainnet: "https://stellar.expert/explorer/public",
  testnet: "https://stellar.expert/explorer/testnet",
};

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}
const onlyProject = arg("project");
const from = arg("from") ? new Date(arg("from")) : null;
const to = arg("to") ? new Date(arg("to")) : null;

async function collect(url) {
  const records = [];
  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const body = await res.json();
    const batch = body._embedded?.records ?? [];
    records.push(...batch);
    url = batch.length === 200 ? body._links?.next?.href : null;
  }
  return records;
}

/**
 * What the sponsor paid for. A CreateContractV2 is a wallet creation; any other
 * contract call is a sponsored use of a wallet, unless the sponsor moved its own
 * funds (a treasury transfer, e.g. seeding a wallet), which is not sponsorship.
 */
function classify(op, account, tx) {
  // Fee-bump of someone else's signed tx: the operations belong to the inner source.
  if (!op) return tx.fee_account === account ? "fee_bump" : "unknown";
  if (op.type === "create_account") return op.funder === account ? "treasury_transfer" : "account_funded";
  if (op.type !== "invoke_host_function") return op.type;
  if (String(op.function).endsWith("CreateContractV2")) return "wallet_created";
  const spentOwn = (op.asset_balance_changes ?? []).some((c) => c.from === account);
  return spentOwn ? "treasury_transfer" : "sponsored_call";
}

const rows = [];
for (const project of PROJECTS) {
  if (onlyProject && project.key !== onlyProject) continue;
  const horizon = HORIZON[project.network];
  for (const account of project.accounts) {
    const [txs, ops] = await Promise.all([
      collect(`${horizon}/accounts/${account}/transactions?limit=200&order=asc`),
      collect(`${horizon}/accounts/${account}/operations?limit=200&order=asc`),
    ]);
    const opByTx = new Map(ops.map((op) => [op.transaction_hash, op]));
    for (const tx of txs) {
      // Only what this account paid for; a funding tx paid by someone else is context, not spend.
      const paid = tx.fee_account === account;
      rows.push({
        time: tx.created_at,
        project: project.key,
        network: project.network,
        sponsor: account,
        kind: classify(opByTx.get(tx.hash), account, tx),
        successful: tx.successful,
        feeXlm: paid ? Number(tx.fee_charged) / 1e7 : 0,
        hash: tx.hash,
        url: `${EXPLORER[project.network]}/tx/${tx.hash}`,
      });
    }
  }
}

rows.sort((a, b) => a.project.localeCompare(b.project) || a.time.localeCompare(b.time));

const spent = new Map();
const out = ["time,project,network,sponsor_account,kind,successful,fee_xlm,project_spent_xlm,tx_hash,explorer_url"];
for (const r of rows) {
  const total = (spent.get(r.project) ?? 0) + r.feeXlm;
  spent.set(r.project, total);
  const t = new Date(r.time);
  if ((from && t < from) || (to && t >= to)) continue;
  out.push(
    [r.time, r.project, r.network, r.sponsor, r.kind, r.successful, r.feeXlm.toFixed(7), total.toFixed(7), r.hash, r.url].join(","),
  );
}
console.log(out.join("\n"));
