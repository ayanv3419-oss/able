import { spawn } from "node:child_process";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
const target = new URL(
  process.env.TEST_POSTGRES_URL || process.env.POSTGRES_URL
);
if (!process.env.TEST_POSTGRES_URL) {
  target.pathname = "/able_test";
}
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
  !target.pathname.endsWith("_test")
) {
  throw new Error(
    "Tests require a local database ending in _test. Set TEST_POSTGRES_URL."
  );
}
const databaseName = target.pathname.slice(1);
if (!/^[a-z0-9_]+$/.test(databaseName)) {
  throw new Error("Invalid test database name.");
}
const maintenance = new URL(target);
maintenance.pathname = "/postgres";
const sql = postgres(maintenance.toString(), { max: 1 });
try {
  const exists =
    await sql`SELECT 1 FROM pg_database WHERE datname = ${databaseName}`;
  if (!exists.length) {
    await sql.unsafe(`CREATE DATABASE "${databaseName}"`);
  }
} finally {
  await sql.end();
}
const port = process.env.TEST_PORT || "3106";
const env = {
  ...process.env,
  ABLE_E2E: "true",
  ABLE_LOCAL_PREVIEW: "false",
  ABLE_MOCK_AI: "true",
  ADMIN_EMAILS: "admin@able.test",
  AUTH_SECRET: "able-isolated-test-secret-not-for-production",
  AUTH_URL: `http://localhost:${port}`,
  CRON_SECRET: "test-cron-secret",
  GROQ_API_KEY: "",
  NEXT_PUBLIC_APP_URL: `http://localhost:${port}`,
  PLAYWRIGHT: "true",
  PORT: port,
  POSTGRES_URL: target.toString(),
  REDIS_URL: "",
  RESEND_API_KEY: "",
  TEST_POSTGRES_URL: target.toString(),
  UPI_ID: "tests@upi",
  UPI_PAYEE_NAME: "Test account",
};
function run(commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, commandArgs, {
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Check failed (${code}).`))
    );
  });
}
await run(["--import", "tsx", "lib/db/migrate.ts"]);
const [suite = "unit", ...args] = process.argv.slice(2);
await run(
  suite === "e2e"
    ? ["node_modules/@playwright/test/cli.js", "test", ...args]
    : suite === "build"
      ? ["node_modules/next/dist/bin/next", "build", ...args]
      : ["node_modules/vitest/vitest.mjs", "run", "--maxWorkers=1", ...args]
);
