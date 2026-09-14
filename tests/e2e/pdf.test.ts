import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { expect, test } from "../fixtures";
import { generateTestEmail, signInWithTestLogin } from "../helpers";

async function seedExportSources(email: string) {
  if (!process.env.TEST_POSTGRES_URL) {
    throw new Error("Use the isolated test database");
  }
  const sql = postgres(process.env.TEST_POSTGRES_URL, { max: 1 });
  const chatId = randomUUID();
  const messageId = randomUUID();
  const documentId = randomUUID();
  try {
    const [student] = await sql`SELECT id FROM "User" WHERE email = ${email}`;
    await sql`INSERT INTO "Chat" (id,"userId",title,"createdAt") VALUES (${chatId},${student.id},'Biology study notes',now())`;
    await sql`INSERT INTO "Document" (id,"userId",title,text,content,"createdAt") VALUES (${documentId},${student.id},'Cell division document','text','# Cell division\n\nTwo daughter cells.',now())`;
    const parts = [
      { text: "Mitosis produces two daughter cells.", type: "text" },
      {
        input: { kind: "text", title: "Cell division document" },
        output: {
          content: "A document was created and is now visible to the user.",
          id: documentId,
          kind: "text",
          title: "Cell division document",
        },
        state: "output-available",
        toolCallId: randomUUID(),
        type: "tool-createDocument",
      },
    ];
    await sql`INSERT INTO "Message_v2" (id,"chatId",role,parts,attachments,"createdAt") VALUES (${messageId},${chatId},'assistant',${sql.json(parts)},'[]'::json,now())`;
    return { chatId, documentId, messageId };
  } finally {
    await sql.end();
  }
}

test("downloads an answer and a document as real PDFs", async ({
  page,
  studentEmail,
}) => {
  const source = await seedExportSources(studentEmail);
  await page.goto(`/chat/${source.chatId}`);
  // The export endpoint can spend up to 60 seconds preparing a cold browser.
  const answerDownload = page.waitForEvent("download", { timeout: 70_000 });
  await page.getByRole("button", { exact: true, name: "Save as PDF" }).click();
  const answer = await answerDownload;
  expect(answer.suggestedFilename()).toBe("biology-study-notes.pdf");
  await answer.saveAs("test-results/pdf/answer-download.pdf");
  await expect(page.getByText("Your PDF is ready.")).toBeVisible();
  await page
    .getByRole("button", { exact: true, name: "Open Cell division document" })
    .click();
  const documentDownload = page.waitForEvent("download", { timeout: 70_000 });
  await page.getByRole("button", { exact: true, name: "Download PDF" }).click();
  const document = await documentDownload;
  expect(document.suggestedFilename()).toBe("cell-division-document.pdf");
  await document.saveAs("test-results/pdf/document-download.pdf");
});

test("requires login, checks ownership and enforces active plans and daily limits", async ({
  page,
  browser,
  studentEmail,
  baseURL,
}) => {
  const source = await seedExportSources(studentEmail);
  const context = await browser.newContext({ baseURL });
  const stranger = await context.newPage();
  try {
    const endpoint = new URL(
      "/api/pdf",
      page.url().startsWith("http") ? page.url() : "http://localhost:3106"
    ).href;
    expect(
      (
        await stranger.request.post(endpoint, {
          data: { id: source.messageId, kind: "message" },
        })
      ).status()
    ).toBe(401);
    await signInWithTestLogin(stranger, generateTestEmail());
    expect(
      (
        await stranger.request.post(endpoint, {
          data: { id: source.messageId, kind: "message" },
        })
      ).status()
    ).toBe(403);
    if (!process.env.TEST_POSTGRES_URL) {
      throw new Error("Use the isolated test database");
    }
    const sql = postgres(process.env.TEST_POSTGRES_URL, { max: 1 });
    try {
      const [other] =
        await sql`INSERT INTO "User" (email) VALUES (${`${randomUUID()}@pdf.test`}) RETURNING id`;
      const foreign = randomUUID();
      await sql`INSERT INTO "Document" (id,"userId",title,text,content,"createdAt") VALUES (${foreign},${other.id},'Private','text','Private notes',now())`;
      expect(
        (
          await page.request.post("/api/pdf", {
            data: { content: "Private notes", id: foreign, kind: "document" },
          })
        ).status()
      ).toBe(404);
      await sql`INSERT INTO "FeatureRun" ("userId",kind,status) SELECT id,'pdf','completed' FROM "User",generate_series(1,20) WHERE email=${studentEmail}`;
      const limited = await page.request.post("/api/pdf", {
        data: { id: source.messageId, kind: "message" },
      });
      expect(limited.status()).toBe(429);
      expect((await limited.json()).error).toContain("20 PDFs");
      await sql`DELETE FROM "Document" WHERE id=${foreign}`;
      await sql`DELETE FROM "User" WHERE id=${other.id}`;
    } finally {
      await sql.end();
    }
  } finally {
    await context.close();
  }
});
