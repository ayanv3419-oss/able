import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

/**
 * Unit tests only. Playwright owns tests/e2e, and lib/ai/models.test.ts is the
 * template's mock model file rather than a test, so neither is included here.
 *
 * .env.local is loaded so the integration test can find POSTGRES_URL.
 */
config({ path: ".env.local", quiet: true });

const root = process.cwd();

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      // "server-only" throws outside a React Server Component build.
      "server-only": path.join(root, "node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
