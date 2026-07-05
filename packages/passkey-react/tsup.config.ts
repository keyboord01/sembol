import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  // NOTE: treeshake (extra rollup pass) strips the "use client" directive.
  external: [/^react($|\/)/, /^react-dom($|\/)/, /^smart-account-kit($|\/)/, /^@stellar\/stellar-sdk($|\/)/],
  banner: {
    js: '"use client";',
  },
});
