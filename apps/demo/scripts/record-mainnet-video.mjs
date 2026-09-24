/**
 * Records the D1 mainnet video: a passkey wallet created on Stellar MAINNET with
 * the fee paid by Sembol Cloud, a passkey-signed payment out of it, and the
 * explorer pages that prove who paid.
 *
 * Real XLM (~0.25 incl. a 1 XLM seed, half of which returns to the sponsor).
 * The passkey is a Chrome virtual authenticator, so no OS prompt appears on
 * screen; the captions say so. Run against a LOCAL app started in mainnet mode:
 *
 *   NEXT_PUBLIC_SEMBOL_NETWORK=mainnet NEXT_PUBLIC_RELAYER_URL=/api/relayer next dev -p 3100
 *   APP_URL=http://localhost:3100 node --env-file=.env.local scripts/record-mainnet-video.mjs
 *
 * Writes the raw recording to scripts/video/ and the hashes to
 * scripts/mainnet-proof-2.json.
 */
import { chromium } from "playwright";
import {
  Keypair,
  Contract,
  Address,
  nativeToScVal,
  TransactionBuilder,
  rpc as stellarRpc,
} from "@stellar/stellar-sdk";
import { writeFileSync, mkdirSync } from "fs";

const APP = process.env.APP_URL ?? "http://localhost:3100";
const RPC = "https://mainnet.sorobanrpc.com";
const HORIZON = "https://horizon.stellar.org";
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

async function seedWallet(walletContractId, amountXlm) {
  const account = await server.getAccount(sponsor.publicKey());
  const op = new Contract(NATIVE_SAC).call(
    "transfer",
    Address.fromString(sponsor.publicKey()).toScVal(),
    Address.fromString(walletContractId).toScVal(),
    nativeToScVal(BigInt(Math.round(amountXlm * 1e7)), { type: "i128" }),
  );
  const built = new TransactionBuilder(account, { fee: "1000", networkPassphrase: PASSPHRASE })
    .addOperation(op)
    .setTimeout(120)
    .build();
  const sim = await server.simulateTransaction(built);
  if (stellarRpc.Api.isSimulationError(sim)) throw new Error("seed sim failed: " + sim.error);
  const prepared = stellarRpc.assembleTransaction(built, sim).build();
  prepared.sign(sponsor);
  const sent = await server.sendTransaction(prepared);
  if (sent.status === "ERROR") throw new Error("seed submit error");
  for (let i = 0; i < 40; i++) {
    const r = await server.getTransaction(sent.hash);
    if (r.status === "SUCCESS") return sent.hash;
    if (r.status === "FAILED") throw new Error("seed failed on-chain");
    await new Promise((s) => setTimeout(s, 1500));
  }
  return sent.hash;
}

/** The newest wallet creation the sponsor paid for: our creation tx. */
async function latestCreationTx(after) {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${HORIZON}/accounts/${sponsor.publicKey()}/operations?order=desc&limit=20`);
    const ops = (await res.json())._embedded.records;
    const op = ops.find((o) => String(o.function).endsWith("CreateContractV2") && o.created_at >= after);
    if (op) return op.transaction_hash;
    await new Promise((s) => setTimeout(s, 2000));
  }
  return null;
}

/** A caption bar over the page, re-applied after every navigation. */
async function caption(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById("__cap");
    if (!el) {
      el = document.createElement("div");
      el.id = "__cap";
      el.style.cssText =
        "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;" +
        "background:rgba(10,10,12,.88);color:#fff;font:600 20px/1.35 system-ui,sans-serif;" +
        "padding:12px 20px;border-radius:12px;max-width:1100px;text-align:center;pointer-events:none";
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}

/** Outline an element on an explorer page so the viewer knows where to look. */
async function highlight(page, text) {
  const loc = page.getByText(text, { exact: false }).first();
  if (!(await loc.count())) return false;
  await loc.scrollIntoViewIfNeeded();
  await loc.evaluate((el) => {
    el.style.outline = "3px solid #f43f5e";
    el.style.outlineOffset = "4px";
    el.style.borderRadius = "4px";
  });
  return true;
}

const pause = (ms) => new Promise((s) => setTimeout(s, ms));
const videoDir = new URL("./video/", import.meta.url).pathname;
mkdirSync(videoDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
});
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

try {
  const startedAt = new Date(Date.now() - 5000).toISOString().replace(/\.\d+Z$/, "Z");

  await page.goto(`${APP}/wallet`, { waitUntil: "networkidle", timeout: 60000 });
  await caption(page, "Sembol on Stellar MAINNET. A new user, no XLM, no seed phrase.");
  await pause(3000);
  await page.getByLabel(/wallet name/i).fill("D1 mainnet");
  await caption(page, "Create wallet → the passkey signs (virtual authenticator in this recording)");
  await pause(1500);
  await page.getByRole("button", { name: /create wallet/i }).click();
  await caption(page, "Sembol Cloud builds, simulates and pays for the deployment…");
  await page.waitForURL("**/dashboard", { timeout: 240000 });
  const contractId = (await page.locator("p.break-all").first().textContent())?.trim();
  if (!contractId?.startsWith("C")) throw new Error("no contract address on dashboard");
  out.wallet = contractId;
  out.walletUrl = expert("contract", contractId);
  await caption(page, "Done: a smart account (C… address) on the audited OpenZeppelin contracts");
  await pause(3000);

  out.createTx = await latestCreationTx(startedAt);
  out.createTxUrl = out.createTx ? expert("tx", out.createTx) : null;
  console.log("wallet", contractId, "create tx", out.createTx);

  out.seedTx = await seedWallet(contractId, SEED_XLM);
  out.seedTxUrl = expert("tx", out.seedTx);

  await page.goto(`${APP}/send`, { waitUntil: "networkidle" });
  await caption(page, `Send ${SEND_XLM} XLM out, signed by the passkey. Fee still sponsored.`);
  await page.getByLabel(/recipient/i).fill(sponsor.publicKey());
  await page.getByLabel(/amount/i).fill(String(SEND_XLM));
  await pause(1500);
  await page.getByRole("button", { name: /review & sign/i }).click();
  await page.getByRole("dialog").waitFor({ timeout: 120000 });
  await caption(page, "Review, then approve with the passkey");
  await pause(2000);
  await page.getByRole("button", { name: /^approve$/i }).click();
  await page.waitForURL("**/history", { timeout: 180000 });
  const txHref = await page.locator('a[href*="/tx/"]').first().getAttribute("href");
  out.sendTx = txHref?.split("/tx/")[1] ?? null;
  out.sendTxUrl = out.sendTx ? expert("tx", out.sendTx) : null;
  await caption(page, "Payment confirmed on mainnet");
  await pause(2500);

  if (out.createTx) {
    // stellar.expert indexes a few seconds behind the network
    await pause(2500);
    await page.goto(out.createTxUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await pause(3000);
    await caption(page, "The creation transaction on stellar.expert");
    await pause(2500);
    await highlight(page, sponsor.publicKey().slice(0, 4));
    await caption(page, "Source account and fee payer: Sembol Cloud's sponsor (GBWU…DWLS), not the user");
    await pause(5500);
    await caption(page, "Fee ≈ 0.165 XLM, about two cents, paid by the app, never by the user");
    await pause(4000);
  }

  out.result = "SUCCESS";
  console.log("\nRECORDING DONE");
} catch (err) {
  out.result = "FAILED";
  out.error = String(err).slice(0, 400);
  console.log("\nFAILED:", out.error);
  process.exitCode = 1;
} finally {
  out.video = await page.video()?.path();
  await context.close();
  await browser.close();
  writeFileSync(new URL("./mainnet-proof-2.json", import.meta.url), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}
