// Cross-browser render + capability smoke check (CI).
//
// WebAuthn's CDP virtual authenticator exists only in Chromium, so the full
// passkey journeys run there (e2e-testnet.mjs / e2e-security.mjs). This check
// covers what CAN be verified everywhere: the app boots, renders its critical
// UI, detects WebAuthn capabilities without crashing, and logs no errors.
//
//   BROWSER=firefox APP_URL=http://localhost:3100 node scripts/ci-browser-check.mjs
import { chromium, firefox, webkit } from "playwright";

const APP = process.env.APP_URL ?? "http://localhost:3100";
const BROWSER = process.env.BROWSER ?? "chromium";
const engines = { chromium, firefox, webkit };
const engine = engines[BROWSER];
if (!engine) {
  console.error(`Unknown BROWSER "${BROWSER}" (chromium | firefox | webkit)`);
  process.exit(2);
}

const browser = await engine.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error}`));

try {
  console.log(`[${BROWSER}] 1. onboarding renders`);
  await page.goto(APP, { waitUntil: "networkidle", timeout: 60000 });
  const body = await page.locator("body").innerText();
  if (!/SEMBOL/i.test(body)) throw new Error("wordmark missing from onboarding");

  // Either the create form or the honest unsupported notice must render -
  // both prove capability detection completed and drove the UI.
  const createVisible = await page
    .getByRole("button", { name: /create wallet/i })
    .isVisible()
    .catch(() => false);
  const unsupportedVisible = await page
    .getByText(/doesn't support passkeys/i)
    .isVisible()
    .catch(() => false);
  if (!createVisible && !unsupportedVisible) {
    throw new Error("neither the create form nor the unsupported notice rendered");
  }
  console.log(
    `[${BROWSER}]    capability outcome: ${createVisible ? "passkey-capable UI" : "unsupported notice"}`,
  );

  console.log(`[${BROWSER}] 2. capability detection API surface`);
  const capabilities = await page.evaluate(() => {
    const supported = typeof window.PublicKeyCredential !== "undefined";
    return {
      publicKeyCredential: supported,
      conditionalApi:
        supported &&
        typeof window.PublicKeyCredential.isConditionalMediationAvailable === "function",
      platformApi:
        supported &&
        typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
          "function",
    };
  });
  console.log(`[${BROWSER}]    ${JSON.stringify(capabilities)}`);

  console.log(`[${BROWSER}] 3. recovery entry point present`);
  await page.getByText(/lost your device\? recover access/i).waitFor({ timeout: 15000 });

  const fatal = consoleErrors.filter(
    // Testnet RPC hiccups in CI are environment noise, not app defects.
    (text) => !/net::|Failed to fetch|NetworkError|ERR_NETWORK/i.test(text),
  );
  if (fatal.length > 0) {
    throw new Error(`console errors: ${fatal.slice(0, 3).join(" | ").slice(0, 400)}`);
  }

  console.log(`[${BROWSER}] SMOKE PASS ✅`);
} catch (error) {
  console.log(`[${BROWSER}] SMOKE FAIL ❌: ${String(error).slice(0, 300)}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
