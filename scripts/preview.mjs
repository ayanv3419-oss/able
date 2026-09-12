import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
const databaseUrl = process.env.POSTGRES_URL;
if (
  !databaseUrl ||
  !["localhost", "127.0.0.1", "::1"].includes(new URL(databaseUrl).hostname)
) {
  throw new Error("Preview requires a local Postgres database.");
}
const sql = postgres(databaseUrl);
try {
  await sql`INSERT INTO "User" (email, name) VALUES ('preview@able.test', 'Local preview') ON CONFLICT DO NOTHING`;
  const [student] =
    await sql`SELECT id FROM "User" WHERE email = 'preview@able.test'`;
  const [active] =
    await sql`SELECT id FROM "Subscription" WHERE "userId" = ${student.id} AND status = 'active' AND "startsAt" <= now() AND "endsAt" > now()`;
  if (!active) {
    const paymentId = randomUUID();
    await sql.begin(async (tx) => {
      await tx`INSERT INTO "Payment" (id,"userId","planId","amountInr",utr,status,"reviewedAt","reviewedBy","reviewNote") VALUES (${paymentId},${student.id},'plus',800,${`DEMO${Date.now()}`},'approved',now(),'local-preview','Sample payment. No money transferred.')`;
      await tx`INSERT INTO "Subscription" ("userId","planId","paymentId","startsAt","endsAt") VALUES (${student.id},'plus',${paymentId},now(),now() + interval '30 days')`;
    });
  }
} finally {
  await sql.end();
}
const port = process.env.PREVIEW_PORT || "3105";
const hasKey = Boolean(
  process.env.GROQ_API_KEY &&
    !/placeholder|your[-_ ]|dummy|example/i.test(process.env.GROQ_API_KEY)
);
const mockAI = process.argv.includes("--mock") || !hasKey;
if (process.argv.includes("--live") && !hasKey) {
  throw new Error("Add GROQ_API_KEY to .env.local before starting live AI.");
}
const url = `http://localhost:${port}`;
console.log(`Able local v1 (no sign-in): ${url}/`);
console.log(
  mockAI
    ? "Sample AI responses (Groq key not configured or --mock selected)."
    : "Live Groq responses enabled."
);
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--port",
    port,
    "--hostname",
    "127.0.0.1",
  ],
  {
    env: {
      ...process.env,
      ABLE_LOCAL_PREVIEW: "true",
      ABLE_MOCK_AI: String(mockAI),
      ADMIN_EMAILS: "preview@able.test",
      AUTH_URL: url,
      CI_PLAYWRIGHT: "",
      NEXT_PUBLIC_APP_URL: url,
      PLAYWRIGHT: "",
      PLAYWRIGHT_TEST_BASE_URL: "",
      RESEND_API_KEY: "",
    },
    stdio: "inherit",
    windowsHide: true,
  }
);
child.on("exit", (code) => process.exit(code ?? 0));
