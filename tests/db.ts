import { randomUUID } from "node:crypto";
import postgres from "postgres";

export async function seedPaidStudent(email: string) {
  if (!process.env.TEST_POSTGRES_URL) {
    throw new Error("Use pnpm test with the isolated test database.");
  }
  const sql = postgres(process.env.TEST_POSTGRES_URL, { max: 1 });
  try {
    const [student] = await sql`SELECT id FROM "User" WHERE email = ${email}`;
    const id = randomUUID();
    await sql`INSERT INTO "Payment" (id,"userId","planId","amountInr",utr,status,"reviewedAt") VALUES (${id},${student.id},'plus',800,${id.replaceAll("-", "").slice(0, 24)},'approved',now())`;
    await sql`INSERT INTO "Subscription" ("userId","planId","paymentId","startsAt","endsAt") VALUES (${student.id},'plus',${id},now(),now()+interval '30 days')`;
  } finally {
    await sql.end();
  }
}

/** Moves the student's plan end to the given number of days from now. */
export async function setPlanEndsInDays(email: string, days: number) {
  if (!process.env.TEST_POSTGRES_URL) {
    throw new Error("Use pnpm test with the isolated test database.");
  }
  const sql = postgres(process.env.TEST_POSTGRES_URL, { max: 1 });
  try {
    await sql`UPDATE "Subscription" SET "endsAt" = now() + make_interval(days => ${days}::int) WHERE "userId" = (SELECT id FROM "User" WHERE email = ${email})`;
  } finally {
    await sql.end();
  }
}

/** Adds uploaded files for the student, dated now, to test the daily cap. */
export async function seedUploadsToday(email: string, files: number) {
  if (!process.env.TEST_POSTGRES_URL) {
    throw new Error("Use pnpm test with the isolated test database.");
  }
  const sql = postgres(process.env.TEST_POSTGRES_URL, { max: 1 });
  try {
    await sql`INSERT INTO "Attachment" ("userId", name, "mediaType", text, "charCount") SELECT id, 'seeded.txt', 'text/plain', 'seeded', 6 FROM "User", generate_series(1, ${files}::int) WHERE email = ${email}`;
  } finally {
    await sql.end();
  }
}
