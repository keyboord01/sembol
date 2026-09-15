/**
 * Channel-lease concurrency proof.
 *
 * Fires N sponsorship requests at /api/relayer AT ONCE and asserts that none
 * fail with a sequence error. Without per-channel leasing, concurrent requests
 * that land on the same channel account read the same sequence number and all
 * but one fail with tx_bad_seq (txBadSeq). With leasing, each channel is used
 * by at most one in-flight request, so every submission gets a fresh sequence.
 *
 *   APP_URL=http://localhost:3000 node scripts/e2e-sponsor-concurrency.mjs
 *
 * Uses the fee-bump path: each request wraps a tiny signed classic tx from its
 * own funded source account, so the ONLY shared state under contention is the
 * project's channel (fee-source) accounts.
 */
import {
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
  Horizon,
} from "@stellar/stellar-sdk";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const N = Number(process.env.PARALLEL ?? 10);
const PASSPHRASE = Networks.TESTNET;
const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");

const fund = async (kp) => {
  const res = await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`);
  if (!res.ok) throw new Error(`friendbot failed for ${kp.publicKey()}`);
};

async function buildSignedInner(source) {
  const account = await horizon.loadAccount(source.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: source.publicKey(), // 1-stroop self-payment: harmless, valid
        asset: Asset.native(),
        amount: "0.0000001",
      }),
    )
    .setTimeout(120)
    .build();
  tx.sign(source);
  return tx.toXDR();
}

async function sponsor(xdr) {
  const res = await fetch(`${APP}/api/relayer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ xdr }),
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-json */
  }
  return { status: res.status, body };
}

console.log(`1. create + fund ${N} source accounts`);
const sources = Array.from({ length: N }, () => Keypair.random());
await Promise.all(sources.map(fund));

console.log("2. build signed inner transactions");
const xdrs = await Promise.all(sources.map(buildSignedInner));

console.log(`3. fire ${N} sponsorship requests IN PARALLEL`);
const started = Date.now();
const results = await Promise.all(xdrs.map(sponsor));
const elapsed = ((Date.now() - started) / 1000).toFixed(1);

let ok = 0;
const badSeq = [];
const otherFail = [];
for (const [i, r] of results.entries()) {
  const success = r.body?.success === true;
  const code = r.body?.errorCode ?? "";
  const errText = JSON.stringify(r.body ?? {});
  const looksBadSeq =
    /bad_?seq|txBadSeq/i.test(code) || /bad_?seq|txBadSeq/i.test(errText);
  if (success) ok++;
  else if (looksBadSeq) badSeq.push(i);
  else otherFail.push({ i, code, status: r.status, err: errText.slice(0, 160) });
}

console.log(`\n   completed in ${elapsed}s`);
console.log(`   success:        ${ok}/${N}`);
console.log(`   tx_bad_seq:     ${badSeq.length}`);
console.log(`   other failures: ${otherFail.length}`);
for (const f of otherFail) console.log(`     [#${f.i}] ${f.status} ${f.code} ${f.err}`);

if (badSeq.length > 0) {
  console.log(`\nCONCURRENCY FAIL ❌: ${badSeq.length} request(s) hit tx_bad_seq`);
  process.exitCode = 1;
} else if (ok < N) {
  console.log(
    `\nCONCURRENCY INCONCLUSIVE ⚠: 0 tx_bad_seq (the lease held), but ${otherFail.length} failed for other reasons`,
  );
  process.exitCode = 2;
} else {
  console.log(`\nCONCURRENCY PASS ✅: ${N} parallel sponsorships, 0 tx_bad_seq`);
}
