import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // happy-dom shares Node's ArrayBuffer/Uint8Array intrinsics — jsdom's
    // separate realm breaks @noble/hashes byte checks inside stellar-sdk.
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    server: {
      deps: {
        // smart-account-kit ships extensionless relative ESM imports that
        // Node can't resolve natively — route it through Vite's resolver.
        inline: ["smart-account-kit"],
      },
    },
  },
});
