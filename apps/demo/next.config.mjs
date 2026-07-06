import path from "node:path";
import { fileURLToPath } from "node:url";

// Monorepo root - inference fails under `vercel build`, and both values must
// agree or Next prefers (Vercel's injected) outputFileTracingRoot.
const monorepoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // smart-account-kit ships extensionless relative ESM imports; let Next
  // transpile/resolve it bundler-style on the server too.
  transpilePackages: ["smart-account-kit"],
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
