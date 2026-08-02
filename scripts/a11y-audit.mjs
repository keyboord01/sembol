// Accessibility audit (axe-core) over every demo page, with a real testnet
// wallet so the gated pages render their full UI.
//
//   APP_URL=http://localhost:3100 node scripts/a11y-audit.mjs
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const APP = process.env.APP_URL ?? "http://localhost:3100";

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

async function audit(label) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );
  const minor = results.violations.filter(
    (violation) => !["serious", "critical"].includes(violation.impact ?? ""),
  );
  console.log(
    `[${label}] ${results.violations.length} violations (${serious.length} serious/critical, ${minor.length} minor)`,
  );
  for (const violation of results.violations) {
    console.log(
      `   ${violation.impact?.toUpperCase().padEnd(8)} ${violation.id}: ${violation.help}`,
    );
    for (const node of violation.nodes.slice(0, 2)) {
      console.log(`      ${String(node.target[0]).slice(0, 110)}`);
    }
  }
  return serious.length;
}

let seriousTotal = 0;
try {
  console.log("== onboarding ==");
  await page.goto(APP, { waitUntil: "networkidle" });
  seriousTotal += await audit("onboarding");

  console.log("== create wallet (for gated pages) ==");
  await page.getByLabel(/wallet name/i).fill("A11y Audit");
  await page.getByRole("button", { name: /create wallet/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 180000 });

  for (const path of ["/dashboard", "/send", "/security", "/history"]) {
    console.log(`== ${path} ==`);
    await page.goto(`${APP}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    seriousTotal += await audit(path);
  }

  // Interactive states: the add-signer panel and the approval modal.
  console.log("== /security with add-signer panel open ==");
  await page.goto(`${APP}/security`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /add signer/i }).click();
  await page.waitForTimeout(400);
  seriousTotal += await audit("security+addsigner");

  console.log("");
  if (seriousTotal > 0) {
    console.log(`A11Y AUDIT: ${seriousTotal} serious/critical violations ❌`);
    process.exitCode = 1;
  } else {
    console.log("A11Y AUDIT: no serious or critical violations ✅");
  }
} catch (error) {
  console.log("A11Y AUDIT FAILED ❌:", String(error).slice(0, 300));
  process.exitCode = 1;
} finally {
  await browser.close();
}
