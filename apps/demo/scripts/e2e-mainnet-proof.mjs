/**
 * Sembol mainnet proof (D1).
 *
 * Creates a real passkey smart-account wallet on Stellar MAINNET, sponsored by
 * Sembol Cloud (our /api/relayer), then proves it can receive and send:
 *   1. create wallet (passkey -> factory deploy, fee sponsored by our channel)
 *   2. seed it: sponsor sends XLM to the wallet via the native SAC (receive)
 *   3. passkey-signed payment FROM the wallet back to the sponsor (send)
 *
 * Records the contract ID and every tx hash to scripts/mainnet-proof.json.
 * Real XLM. Run against a LOCAL app started in mainnet mode.
 *
 *   APP_URL=http://localhost:3000 node scripts/e2e-mainnet-proof.mjs
 */
import { chromium } from "playwright";
import {
  Keypair,
  Contract,
  Address,
  nativeToScVal,
  TransactionBuilder,
  Operation,
  rpc as stellarRpc,
} from "@stellar/stellar-sdk";
import { writeFileSync } from "fs";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const RPC = "https://mainnet.sorobanrpc.com";
const PASSPHRASE = "Public Global Stellar Network ; September 2015";
const NATIVE_SAC = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
const SEED_XLM = 1;
const SEND_XLM = 0.5;

const sponsorSecret = process.env.MAINNET_SPONSOR_SECRET;
if (!sponsorSecret) {
  console.error("MAINNET_SPONSOR_SECRET not set");
  process.exit(2);
}
const sponsor = Keypair.fromSecret(sponsorSecret);
const server = new stellarRpc.Server(RPC);
const expert = (kind, id) => `https://stellar.expert/explorer/public/${kind}/${id}`;
const out = { network: "public", createdAt: new Date().toISOString(), sponsor: sponsor.publicKey() };

async function submitAndConfirm(tx) {
  const sent = await server.sendTransaction(tx);
  if (sent.status === "ERROR") {
    throw new Error("submit error: " + JSON.stringify(sent.errorResult ?? sent));
  }
  const hash = sent.hash;
  for (let i = 0; i < 40; i++) {
    const r = await server.getTransaction(hash);
    if (r.status === stellarRpc.Api.GetTransactionStatus.SUCCESS) return hash;
    if (r.status === stellarRpc.Api.GetTransactionStatus.FAILED)
      throw new Error("tx failed on-chain: " + hash);
    await new Promise((s) => setTimeout(s, 2000));
  }
  return hash; // pending past timeout; caller can check the hash
}

/** sponsor -> wallet: native SAC transfer (the wallet RECEIVES XLM on mainnet). */
async function seedWallet(walletContractId, amountXlm) {
  const account = await server.getAccount(sponsor.publicKey());
  const amount = nativeToScVal(BigInt(Math.round(amountXlm * 1e7)), { type: "i128" });
  const op = new Contract(NATIVE_SAC).call(
    "transfer",
    Address.fromString(sponsor.publicKey()).toScVal(),
    Address.fromString(walletContractId).toScVal(),
    amount,
  );
  const built = new TransactionBuilder(account, { fee: "1000", networkPassphrase: PASSPHRASE })
    .addOperation(op)
    .setTimeout(120)
    .build();
  const sim = await server.simulateTransaction(built);
  if (stellarRpc.Api.isSimulationError(sim)) throw new Error("seed sim failed: " + sim.error);
  const prepared = stellarRpc.assembleTransaction(built, sim).build();
  prepared.sign(sponsor);
  return submitAndConfirm(prepared);
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("WebAuthn.enable");
await cdp.send("WebAuthn.addVirtualAuthenticator", {
  options: {
    protocol: "ctap2",
    transport: "internal",
    hasResidentKey: true,
    hasUserVerification: true,
    isUserVerified: true,
    automaticPresenceSimulation: true,
  },
});
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));

try {
  console.log("1. create wallet on MAINNET (passkey -> sponsored factory deploy)");
  await page.goto(`${APP}/wallet`, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByLabel(/wallet name/i).fill("Mainnet Proof");
  await page.getByRole("button", { name: /create wallet/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 240000 });
  const contractId = (await page.locator("p.break-all").first().textContent())?.trim();
  if (!contractId?.startsWith("C")) throw new Error("no contract address on dashboard");
  out.wallet = contractId;
  out.walletUrl = expert("contract", contractId);
  console.log("   wallet:", contractId);

  console.log(`2. seed the wallet with ${SEED_XLM} XLM from the sponsor (RECEIVE proof)`);
  out.seedTx = await seedWallet(contractId, SEED_XLM);
  out.seedTxUrl = expert("tx", out.seedTx);
  console.log("   seed tx:", out.seedTx);

  console.log(`3. passkey-signed payment of ${SEND_XLM} XLM FROM the wallet -> sponsor (SEND proof)`);
  await page.goto(`${APP}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(4000); // let balance reflect the seed
  await page.goto(`${APP}/send`, { waitUntil: "networkidle" });
  await page.getByLabel(/recipient/i).fill(sponsor.publicKey());
  await page.getByLabel(/amount/i).fill(String(SEND_XLM));
  await page.getByRole("button", { name: /review & sign/i }).click();
  await page.getByRole("dialog").waitFor({ timeout: 120000 });
  await page.getByRole("button", { name: /^approve$/i }).click();
  await page.waitForURL("**/history", { timeout: 180000 });
  const txHref = await page.locator('a[href*="/tx/"]').first().getAttribute("href");
  out.sendTx = txHref?.split("/tx/")[1] ?? null;
  out.sendTxUrl = out.sendTx ? expert("tx", out.sendTx) : null;
  console.log("   send tx:", out.sendTx);

  out.result = "SUCCESS";
  console.log("\nMAINNET PROOF SUCCESS ✅");
} catch (err) {
  out.result = "FAILED";
  out.error = String(err).slice(0, 400);
  console.log("\nMAINNET PROOF FAILED ❌:", out.error);
  process.exitCode = 1;
} finally {
  writeFileSync(new URL("./mainnet-proof.json", import.meta.url), JSON.stringify(out, null, 2));
  console.log("\nwrote scripts/mainnet-proof.json");
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}
