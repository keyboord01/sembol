/**
 * Generate the agent-readable docs shipped inside the npm package.
 *
 * Source of truth is apps/demo/lib/docs-content.ts — the same content that
 * renders sembol.xyz/docs and /llms.txt. Generating rather than duplicating
 * means the docs an AI greps out of node_modules can never drift from the
 * published site, which is the whole point: stale docs teach an agent the
 * wrong API and it confidently ships it.
 *
 *   pnpm docs:package   (runs automatically before the library builds)
 */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outDir = resolve(root, "packages/passkey-react/docs");

const { PAGES, pageToMarkdown } = await import(
  resolve(root, "apps/demo/lib/docs-content.ts")
);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const index = [
  "# Sembol documentation",
  "",
  "`@sembol/passkey-react` — React components and headless hooks that turn a passkey",
  "into a self-custodial Stellar smart account (an audited OpenZeppelin smart-account",
  "contract), with transaction fees sponsored so a new user needs no XLM.",
  "",
  "These files ship inside the package so an assistant working in a project that has",
  "Sembol installed can read them directly from `node_modules/@sembol/passkey-react/docs/`,",
  "without a network call. They are generated from the same source as https://sembol.xyz/docs.",
  "",
  "| Task | File |",
  "| --- | --- |",
];

for (const page of PAGES) {
  const file = `${page.slug === "index" ? "introduction" : page.slug}.md`;
  writeFileSync(resolve(outDir, file), pageToMarkdown(page), "utf8");
  index.push(`| ${page.description} | [${file}](${file}) |`);
}

index.push(
  "",
  "## Canonical links",
  "",
  "- Docs site: https://sembol.xyz/docs",
  "- Machine-readable index: https://sembol.xyz/llms.txt",
  "- Everything in one file: https://sembol.xyz/llms-full.txt",
  "- Source (MIT): https://github.com/keyboord01/sembol",
  "",
);
writeFileSync(resolve(outDir, "README.md"), index.join("\n"), "utf8");
console.log(`generated ${PAGES.length + 1} files in packages/passkey-react/docs/`);
