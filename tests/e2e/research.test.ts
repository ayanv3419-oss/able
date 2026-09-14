import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { expect, test } from "../fixtures";

test("research gathers several source passes, saves the report and bills its searches", async ({
  page,
  studentEmail,
}) => {
  const chatId = randomUUID();
  const response = await page.request.post("/api/chat", {
    data: {
      deepResearch: true,
      id: chatId,
      message: {
        id: randomUUID(),
        parts: [
          {
            text: "Research cell division and compare the evidence.",
            type: "text",
          },
        ],
        role: "user",
      },
      selectedVisibilityType: "private",
    },
  });
  expect(response.status()).toBe(200);
  const stream = await response.text();
  expect(stream).toContain("Researching sources 1 of 2");
  expect(stream).toContain("Researching sources 2 of 2");
  expect(stream).toContain("source-url");
  expect(stream).not.toContain('"type":"error"');
  const stored = await (
    await page.request.get(`/api/messages?chatId=${chatId}`)
  ).json();
  const answer = stored.messages.find(
    (item: { role: string }) => item.role === "assistant"
  );
  expect(
    answer.parts.some((part: { type: string }) => part.type === "source-url")
  ).toBe(true);
  if (!process.env.TEST_POSTGRES_URL) {
    throw new Error("Use the isolated test database");
  }
  const sql = postgres(process.env.TEST_POSTGRES_URL, { max: 1 });
  try {
    const [usage] =
      await sql`SELECT coalesce(sum("webSearches"),0)::int AS searches FROM "UsageEvent" WHERE "chatId"=${chatId}`;
    expect(usage.searches).toBe(2);
    const [run] =
      await sql`SELECT status FROM "FeatureRun" WHERE "userId"=(SELECT id FROM "User" WHERE email=${studentEmail}) AND kind='research'`;
    expect(run.status).toBe("completed");
  } finally {
    await sql.end();
  }
  await page.goto(`/chat/${chatId}`);
  await expect(
    page.getByRole("button", { exact: true, name: "Save as PDF" })
  ).toBeAttached();
  await expect(
    page.getByRole("button", { exact: true, name: "Deep research" })
  ).toBeVisible();
});

test("Basic cannot start research and research limits are enforced on the server", async ({
  page,
  studentEmail,
}) => {
  if (!process.env.TEST_POSTGRES_URL) {
    throw new Error("Use the isolated test database");
  }
  const sql = postgres(process.env.TEST_POSTGRES_URL, { max: 1 });
  const body = () => ({
    deepResearch: true,
    id: randomUUID(),
    message: {
      id: randomUUID(),
      parts: [{ text: "Research biology", type: "text" }],
      role: "user",
    },
    selectedVisibilityType: "private",
  });
  try {
    await sql`UPDATE "Subscription" SET "planId"='basic' WHERE "userId"=(SELECT id FROM "User" WHERE email=${studentEmail})`;
    expect(
      (await page.request.post("/api/chat", { data: body() })).status()
    ).toBe(403);
    await sql`UPDATE "Subscription" SET "planId"='plus' WHERE "userId"=(SELECT id FROM "User" WHERE email=${studentEmail})`;
    await sql`INSERT INTO "FeatureRun" ("userId",kind,status) SELECT id,'research','completed' FROM "User",generate_series(1,3) WHERE email=${studentEmail}`;
    expect(
      (await page.request.post("/api/chat", { data: body() })).status()
    ).toBe(429);
  } finally {
    await sql.end();
  }
});
