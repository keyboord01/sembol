// Focused diagnostic: does the spending-limit pin fire, and does the policy
// meter? Creates a wallet, sets a 5 XLM/day limit, sends 2 XLM, reads the
// policy state via the in-page kit bridge, then attempts the over-limit send.
import { chromium } from "playwright";

const APP = process.env.APP_URL ?? "http://localhost:3100";
const DEPLOYER = "GAAH4OT36RRCCAGKARGPN2HLHT2NOBVFHO4GUHA6CF7UKQ4MMV24WQ4N";
const POLICY = "CABXBYJNZ7IUW4G3D6BND5YCAQF3ASSDMDAOKQQ63UYFSO7WUU2TIP5G";

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

page.on("console", (m) => {
  const text = m.text();
  if (text.includes("[sembol]") || m.type() === "error") {
    console.log(`   [console.${m.type()}]`, text.slice(0, 250));
  }
});

const readPolicyState = () =>
  page.evaluate(
    async ([policyAddr]) => {
      const kit = window.__sembolKit;
      if (!kit) return { error: "no kit bridge" };
      try {
        const rules = await kit.rules.list();
        const summary = rules.map((r) => ({
          id: r.id,
          tag: r.context_type?.tag,
          token: r.context_type?.values?.[0],
          policies: r.policies,
          signers: r.signers?.length,
        }));
        const scoped = rules.find(
          (r) => r.context_type?.tag === "CallContract" && r.policies?.includes(policyAddr),
        );
        if (!scoped) return { rules: summary, policy: "no scoped policy rule found" };
        const data = await kit.policyClients.spendingLimit(policyAddr).getSpendingLimitData(scoped.id);
        return {
          rules: summary,
          ruleId: scoped.id,
          limit: String(data.spending_limit),
          spent: String(data.cached_total_spent),
          history: data.spending_history.length,
        };
      } catch (err) {
        return { error: String(err).slice(0, 200) };
      }
    },
    [POLICY],
  );

async function send(amount) {
  await page.goto(`${APP}/send`, { waitUntil: "networkidle" });
  await page.getByLabel(/recipient/i).fill(DEPLOYER);
  await page.getByLabel(/amount/i).fill(String(amount));
  await page.getByRole("button", { name: /review & sign/i }).click();
  await page.getByRole("dialog").waitFor({ timeout: 90000 });
  await page.getByRole("button", { name: /^approve$/i }).click();
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (page.url().includes("/history")) return { landed: true };
    const alerts = await page
      .locator('[role="alert"], .sembol-modal__status--error')
      .allTextContents()
      .catch(() => []);
    const text = alerts.join(" | ").trim();
    if (text) return { landed: false, error: text };
    await page.waitForTimeout(2500);
  }
  return { landed: false, error: "(timeout, no outcome)" };
}

try {
  console.log("1. create wallet");
  await page.goto(APP, { waitUntil: "networkidle" });
  await page.getByLabel(/wallet name/i).fill("E2E Policy Debug");
  await page.getByRole("button", { name: /create wallet/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 180000 });
  const addr = (await page.locator("p.break-all").first().textContent())?.trim();
  console.log("   wallet:", addr);

  console.log("2. set 5 XLM/day limit");
  await page.goto(`${APP}/security`, { waitUntil: "networkidle" });
  await page.getByLabel(/limit \(xlm\)/i).fill("5");
  await page.getByRole("button", { name: /^set limit$/i }).click();
  await page.locator(".sembol-policy__current").waitFor({ timeout: 180000 });
  console.log("   state after set:", JSON.stringify(await readPolicyState()));

  console.log("3. send 2 XLM (inside limit)");
  const first = await send(2);
  console.log("   outcome:", JSON.stringify(first));
  console.log("   state after 2 XLM:", JSON.stringify(await readPolicyState()));

  console.log("4. send 4 XLM (over remaining)");
  const second = await send(4);
  console.log("   outcome:", JSON.stringify(second));
  console.log("   state after 4 XLM attempt:", JSON.stringify(await readPolicyState()));

  console.log("");
  if (first.landed && !second.landed && /spending|limit|exceed/i.test(second.error ?? "")) {
    console.log("POLICY DEBUG: ENFORCEMENT WORKING ✅");
  } else if (first.landed && !second.landed) {
    console.log("POLICY DEBUG: over-limit rejected (generic surface) ✅ error:", second.error);
  } else {
    console.log("POLICY DEBUG: ENFORCEMENT BROKEN ❌", JSON.stringify({ first, second }));
    process.exitCode = 1;
  }
} catch (err) {
  console.log("POLICY DEBUG FAILED ❌:", String(err).slice(0, 300));
  await page.screenshot({ path: "e2e-policy-debug-failure.png", fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
