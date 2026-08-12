// End-to-end verification of the Month 2 account-security layer against LIVE
// Stellar testnet: add/remove signer, recovery enrollment + fresh-browser
// recovery, and an enforced on-chain spending limit.
import { chromium } from "playwright";

const APP = process.env.APP_URL ?? "http://localhost:3100";
const DEPLOYER = "GAAH4OT36RRCCAGKARGPN2HLHT2NOBVFHO4GUHA6CF7UKQ4MMV24WQ4N";

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
  console.log(`[state:${label}]`, text.replace(/\s+/g, " ").slice(0, 500));
}

const signerRows = () => page.locator(".sembol-signers__list > li");

async function waitForRowCount(expected, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await signerRows().count();
    if (count === expected) return;
    await page.waitForTimeout(2000);
  }
  throw new Error(`signer rows never reached ${expected} (now ${await signerRows().count()})`);
}

try {
  console.log("1. create wallet");
  await page.goto(APP, { waitUntil: "networkidle" });
  await page.getByLabel(/wallet name/i).fill("E2E Security");
  await page.getByRole("button", { name: /create wallet/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 180000 });
  const addr = (await page.locator("p.break-all").first().textContent())?.trim();
  console.log("   wallet:", addr);
  if (!addr?.startsWith("C")) throw new Error("no contract address rendered");

  console.log("2. security page: expect 1 signer (this device)");
  await page.goto(`${APP}/security`, { waitUntil: "networkidle" });
  await waitForRowCount(1);
  const firstRow = (await signerRows().first().innerText()).replace(/\s+/g, " ");
  console.log("   row:", firstRow.slice(0, 120));
  if (!/this device/i.test(firstRow)) throw new Error("active signer not tagged 'This device'");
  const removeDisabled = await signerRows()
    .first()
    .getByRole("button", { name: /^remove/i })
    .isDisabled();
  console.log("   last-signer remove disabled:", removeDisabled);
  if (!removeDisabled) throw new Error("last signer remove should be disabled");

  console.log("3. add a second passkey signer 'backup'");
  await page.getByRole("button", { name: /add signer/i }).click();
  await page.getByRole("button", { name: /new passkey/i }).click();
  await page.getByLabel(/name \(optional\)/i).fill("backup");
  await page.getByRole("button", { name: /^create passkey$/i }).click();
  await waitForRowCount(2, 180000);
  console.log("   ✓ 2 signers listed");
  const rows = await signerRows().allInnerTexts();
  console.log("   rows:", rows.map((r) => r.replace(/\s+/g, " ").slice(0, 80)));

  console.log("4. remove the backup signer (two-step confirm)");
  const backupRow = signerRows().filter({ hasText: "backup" }).first();
  await backupRow.getByRole("button", { name: /remove backup/i }).click();
  await backupRow.getByRole("button", { name: /confirm remove/i }).click();
  await waitForRowCount(1, 180000);
  console.log("   ✓ back to 1 signer");

  console.log("5. enroll a recovery passkey");
  await page.getByRole("button", { name: /recovery passkey/i }).click();
  await page
    .locator(".sembol-recovery__form")
    .getByLabel(/name \(optional\)/i)
    .fill("recovery");
  await page.getByRole("button", { name: /create recovery passkey/i }).click();
  await page.locator(".sembol-recovery__done").waitFor({ timeout: 180000 });
  const saveBox = (await page.locator(".sembol-recovery__save").innerText()).replace(/\s+/g, " ");
  console.log("   ✓ enrolled;", saveBox.slice(0, 140));
  if (!saveBox.includes(addr)) throw new Error("recovery done state does not show the address");
  await waitForRowCount(2, 60000);
  console.log("   ✓ recovery signer visible in list");

  console.log("6. set a 5 XLM per-day spending limit");
  await page.getByLabel(/limit \(xlm\)/i).fill("5");
  await page.getByRole("button", { name: /^set limit$/i }).click();
  await page.locator(".sembol-policy__current").waitFor({ timeout: 180000 });
  const policyBox = (await page.locator(".sembol-policy__current").innerText()).replace(/\s+/g, " ");
  console.log("   ✓ limit live:", policyBox.slice(0, 140));
  if (!/5\s*XLM/.test(policyBox)) throw new Error("limit readout missing 5 XLM");

  console.log("7. send 2 XLM (inside the limit) - must succeed");
  await page.goto(`${APP}/send`, { waitUntil: "networkidle" });
  await page.getByLabel(/recipient/i).fill(DEPLOYER);
  await page.getByLabel(/amount/i).fill("2");
  await page.getByRole("button", { name: /review & sign/i }).click();
  await page.getByRole("dialog").waitFor({ timeout: 90000 });
  await page.getByRole("button", { name: /^approve$/i }).click();
  await page.waitForURL("**/history", { timeout: 120000 });
  const txLink = await page.locator('a[href*="/tx/"]').first().getAttribute("href");
  console.log("   ✓ 2 XLM confirmed:", txLink);

  console.log("8. send 4 XLM (over the remaining 3) - must be REJECTED");
  await page.goto(`${APP}/send`, { waitUntil: "networkidle" });
  await page.getByLabel(/recipient/i).fill(DEPLOYER);
  await page.getByLabel(/amount/i).fill("4");
  await page.getByRole("button", { name: /review & sign/i }).click();
  // The rejection can surface either in the approval modal (sign/submit path)
  // or as a page-level toast if the pre-flight simulation already fails.
  let rejectionText = "";
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (page.url().includes("/history")) {
      throw new Error("over-limit transfer LANDED ON HISTORY - spending limit did not enforce");
    }
    const alerts = await page
      .locator('[role="alert"], .sembol-modal__status--error')
      .allTextContents()
      .catch(() => []);
    rejectionText = alerts.join(" | ").trim();
    if (rejectionText) break;
    const approve = page.getByRole("button", { name: /^approve$/i });
    if (await approve.isVisible().catch(() => false)) {
      await approve.click().catch(() => {});
    }
    await page.waitForTimeout(3000);
  }
  if (!rejectionText) throw new Error("no rejection surfaced for the over-limit transfer");
  console.log("   ✓ rejected:", rejectionText.slice(0, 220));
  if (/spending limit/i.test(rejectionText)) {
    console.log("   ✓ mapped to the spending-limit error message");
  } else {
    console.log("   ⚠ rejection surfaced with a generic message (still enforced on-chain)");
  }

  console.log("9. fresh-browser recovery (storage wiped, passkeys kept)");
  await page.evaluate(async () => {
    localStorage.clear();
    const dbs = (await indexedDB.databases?.()) ?? [{ name: "smart-account-kit" }];
    await Promise.all(
      dbs
        .filter((db) => db.name)
        .map(
          (db) =>
            new Promise((resolve) => {
              const req = indexedDB.deleteDatabase(db.name);
              req.onsuccess = req.onerror = req.onblocked = () => resolve(undefined);
            }),
        ),
    );
  });
  await page.goto(APP, { waitUntil: "networkidle" });
  await page.getByText(/lost your device\? recover access/i).click();
  await page.getByRole("button", { name: /recover with passkey/i }).click();

  // Two valid branches: direct reconnect, or the manual-address fallback when
  // the indexer has not caught up with this brand-new wallet.
  const recoveryDeadline = Date.now() + 120000;
  let recovered = false;
  while (Date.now() < recoveryDeadline) {
    if (page.url().includes("/dashboard")) {
      recovered = true;
      break;
    }
    const addressInput = page.getByLabel(/wallet address \(c…\)/i);
    if (await addressInput.isVisible().catch(() => false)) {
      console.log("   discovery unavailable - using the saved address fallback");
      await addressInput.fill(addr);
      await page.getByRole("button", { name: /^recover$/i }).click();
    }
    const choice = page.locator(".sembol-recovery__choice").first();
    if (await choice.isVisible().catch(() => false)) {
      console.log("   multiple wallets found - picking the first");
      await choice.click();
    }
    await page.waitForTimeout(3000);
  }
  if (!recovered) throw new Error("recovery did not reach the dashboard");
  console.log("   ✓ recovered to dashboard after storage wipe");

  console.log("");
  console.log("CONTRACT_URL: https://stellar.expert/explorer/testnet/contract/" + addr);
  console.log("TX_URL:", txLink);
  console.log("E2E SECURITY SUCCESS ✅");
} catch (err) {
  console.log("E2E SECURITY FAILED ❌:", String(err).slice(0, 400));
  await dumpState("failure");
  await page.screenshot({ path: "e2e-security-failure.png", fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
