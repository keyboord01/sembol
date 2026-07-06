// End-to-end verification of the Sembol demo against LIVE Stellar testnet,
// using Chrome's virtual authenticator (CDP WebAuthn domain) for passkeys.
import { chromium } from "playwright";

const APP = "http://localhost:3100";
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

page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
page.on("console", (m) => {
  if (m.type() === "error") console.log("[console.error]", m.text().slice(0, 250));
});

async function dumpState(label) {
  const text = await page.locator("body").innerText().catch(() => "(no body)");
  console.log(`[state:${label}]`, text.replace(/\s+/g, " ").slice(0, 400));
}

try {
  console.log("1. open onboarding");
  await page.goto(APP, { waitUntil: "networkidle" });

  console.log("2. create wallet (passkey → deploy → fund on testnet)…");
  await page.getByRole("button", { name: /create your wallet/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 180000 });
  console.log("3. dashboard reached — wallet deployed");

  const addr = (await page.locator("p.font-mono").first().textContent())?.trim();
  console.log("   contract address:", addr);
  if (!addr?.startsWith("C")) throw new Error("no contract address rendered");

  // Balance should be non-zero (Friendbot). Wait for a value > 0, refreshing if needed.
  await page.waitForSelector('.sembol-balance[data-status="success"]', { timeout: 90000 });
  let bal = "0";
  for (let attempt = 0; attempt < 6; attempt++) {
    bal = ((await page.locator(".sembol-balance__value").first().textContent()) ?? "0").trim();
    if (bal !== "0" && bal !== "–") break;
    await page.waitForTimeout(4000);
    await page.getByRole("button", { name: /refresh balance/i }).click().catch(() => {});
  }
  console.log("   funded balance:", bal, "XLM");
  if (bal === "0") console.log("   ⚠ balance still 0 after retries");

  console.log("4. full-reload session restore check");
  await page.goto(`${APP}/send`, { waitUntil: "networkidle" });
  await dumpState("send-after-reload");
  await page.getByLabel(/recipient/i).waitFor({ timeout: 45000 });
  console.log("   ✓ session restored after reload, send form visible");

  console.log("5. send flow: 1 XLM to the kit deployer account");
  await page.getByLabel(/recipient/i).fill("GAAH4OT36RRCCAGKARGPN2HLHT2NOBVFHO4GUHA6CF7UKQ4MMV24WQ4N");
  await page.getByLabel(/amount/i).fill("1");
  await page.getByRole("button", { name: /review & sign/i }).click();

  await page.getByRole("dialog").waitFor({ timeout: 90000 });
  console.log("   modal summary:", (await page.locator(".sembol-summary").textContent())?.replace(/\s+/g, " ").slice(0, 200));
  await page.getByRole("button", { name: /^approve$/i }).click();

  // Watch the modal's status while the sign→resimulate→submit flow runs.
  let modalFailed = false;
  for (let i = 0; i < 12; i++) {
    if (page.url().includes("/history")) break;
    const statusText = (
      await page.locator(".sembol-modal__status, [role=alert]").allTextContents().catch(() => [])
    ).join(" | ");
    if (statusText.trim()) console.log(`   [t+${i * 5}s]`, statusText.slice(0, 300));
    if (/could not be submitted|failed/i.test(statusText)) {
      modalFailed = true;
      break;
    }
    await page.waitForTimeout(5000);
  }

  if (modalFailed) {
    console.log("7. DISCRIMINATOR: kit.transfer() direct (bypasses Sembol tx builder)");
    const direct = await page.evaluate(
      async ([sac, dest]) => {
        const kit = window.__sembolKit;
        if (!kit) return { error: "no kit bridge" };
        try {
          return await kit.transfer(sac, dest, 1);
        } catch (err) {
          return { error: String(err) };
        }
      },
      [
        "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
        "GAAH4OT36RRCCAGKARGPN2HLHT2NOBVFHO4GUHA6CF7UKQ4MMV24WQ4N",
      ],
    );
    console.log("   kit.transfer result:", JSON.stringify(direct).slice(0, 600));
    throw new Error("modal path failed; see discriminator result above");
  }

  await page.waitForURL("**/history", { timeout: 30000 });
  const txLink = await page.locator('a[href*="/tx/"]').first().getAttribute("href");
  console.log("6. history reached");
  console.log("CONTRACT_URL: https://stellar.expert/explorer/testnet/contract/" + addr);
  console.log("TX_URL:", txLink);
  console.log("E2E SUCCESS ✅");
} catch (err) {
  console.log("E2E FAILED ❌:", String(err).slice(0, 400));
  await dumpState("failure");
  await page.screenshot({ path: "e2e-failure.png", fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
