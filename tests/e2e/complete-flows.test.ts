import { randomUUID } from "node:crypto";
import { test as baseTest, expect } from "@playwright/test";
import { test } from "../fixtures";
import { generateTestEmail, signInWithTestLogin } from "../helpers";

test("persists a conversation, regenerates it and replaces edited text", async ({
  page,
}) => {
  const id = randomUUID();
  const messageId = randomUUID();
  const body = {
    id,
    message: {
      id: messageId,
      parts: [{ text: "Hello", type: "text" }],
      role: "user",
    },
    selectedVisibilityType: "private",
  };
  const sent = await page.request.post("/api/chat", { data: body });
  expect(sent.status()).toBe(200);
  expect(await sent.text()).toContain("text-delta");
  const retry = await page.request.post("/api/chat", {
    data: {
      ...body,
      message: {
        ...body.message,
        parts: [{ text: "Explain gravity", type: "text" }],
      },
      trigger: "regenerate-message",
    },
  });
  expect(retry.status()).toBe(200);
  expect(await retry.text()).toContain("text-delta");
  const saved = await page.request.get(`/api/messages?chatId=${id}`);
  const data = await saved.json();
  expect(data.messages).toHaveLength(2);
  expect(data.messages[0].parts[0].text).toBe("Explain gravity");
  await page.goto(`/chat/${id}`);
  await expect(
    page.getByText("Explain gravity", { exact: true })
  ).toBeVisible();
  await expect(page.getByTestId("message-regenerate")).toBeAttached();
});

test("extracts an upload, enforces ownership and transcribes voice", async ({
  page,
  browser,
}) => {
  const upload = await page.request.post("/api/files/upload", {
    multipart: {
      file: {
        buffer: Buffer.from("The cell is the basic unit of life."),
        mimeType: "text/plain",
        name: "notes.txt",
      },
    },
  });
  expect(upload.status()).toBe(200);
  const file = await upload.json();
  expect(file.url).toMatch(/^attachment:\/\//);
  const id = randomUUID();
  const body = {
    id,
    message: {
      id: randomUUID(),
      parts: [
        {
          filename: file.name,
          mediaType: file.contentType,
          type: "file",
          url: file.url,
        },
      ],
      role: "user",
    },
    selectedVisibilityType: "private",
  };
  const response = await page.request.post("/api/chat", { data: body });
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("text-delta");
  const other = await browser.newContext();
  try {
    const otherPage = await other.newPage();
    const otherEmail = generateTestEmail();
    await signInWithTestLogin(otherPage, otherEmail);
    const { seedPaidStudent } = await import("../db");
    await seedPaidStudent(otherEmail);
    expect(
      (await otherPage.request.get(`/api/messages?chatId=${id}`)).status()
    ).toBe(403);
    const forbidden = await otherPage.request.post("/api/chat", {
      data: { ...body, id: randomUUID() },
    });
    expect(forbidden.status()).toBe(400);
  } finally {
    await other.close();
  }
  const voice = await page.request.post("/api/transcribe", {
    multipart: {
      durationSeconds: "3",
      file: {
        buffer: Buffer.from("mock-audio"),
        mimeType: "audio/webm",
        name: "voice.webm",
      },
    },
  });
  expect(voice.status()).toBe(200);
  expect((await voice.json()).text).toContain("transcription");
  const tooLong = await page.request.post("/api/transcribe", {
    multipart: {
      durationSeconds: "90",
      file: {
        buffer: Buffer.from("mock-audio"),
        mimeType: "audio/webm",
        name: "voice.webm",
      },
    },
  });
  expect(tooLong.status()).toBe(400);
});

test("saves settings and creates a project with persistent instructions", async ({
  page,
}) => {
  await page.goto("/settings");
  await page
    .getByLabel("What should Able know about you?", { exact: true })
    .fill("I study biology.");
  await page
    .getByLabel("How should Able respond to you?")
    .fill("Use concise explanations.");
  await page.getByRole("button", { exact: true, name: "Save" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("What should Able know about you?", { exact: true })
  ).toHaveValue("I study biology.");
  await page.getByLabel("Name or nickname", { exact: true }).fill("Ayan");
  await page
    .getByLabel("Reply language", { exact: true })
    .selectOption("Hinglish");
  await page.getByRole("button", { exact: true, name: "Save profile" }).click();
  await expect(page.getByText("Profile saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Name or nickname", { exact: true })
  ).toHaveValue("Ayan");
  await expect(page.getByLabel("Reply language", { exact: true })).toHaveValue(
    "Hinglish"
  );
  await page.goto("/projects");
  await page.getByRole("button", { exact: true, name: "New project" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Name", { exact: true })
    .fill("Biology revision");
  await page
    .getByRole("button", { exact: true, name: "Create project" })
    .click();
  await page
    .getByRole("link", { exact: true, name: "Open project: Biology revision" })
    .click();
  await page.getByText("Project instructions", { exact: true }).click();
  await page.getByLabel("Instructions", { exact: true }).fill("Use SI units.");
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/project/")
    ),
    page.getByRole("button", { name: "Save instructions" }).click(),
  ]);
  await page.reload();
  await page.getByText("Project instructions", { exact: true }).click();
  await expect(page.getByLabel("Instructions", { exact: true })).toHaveValue(
    "Use SI units."
  );
});

baseTest(
  "payment approval unlocks chat and a refund ends access",
  async ({ page, browser }) => {
    const studentEmail = generateTestEmail();
    await signInWithTestLogin(page, studentEmail);
    expect(
      (await (await page.request.get("/api/entitlements")).json()).canSend
    ).toBe(false);
    const utr = randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase();
    await page.goto("/pay/basic");
    await page.getByLabel("UPI reference number (UTR)").fill(utr);
    await page
      .getByRole("button", { name: "I've paid — submit reference number" })
      .click();
    await expect(page).toHaveURL(/\/billing$/);
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: "Basic" })
        .getByRole("cell", { exact: true, name: "Waiting for approval" })
    ).toBeVisible();
    const admin = await browser.newContext();
    try {
      const adminPage = await admin.newPage();
      await signInWithTestLogin(adminPage, "admin@able.test");
      await adminPage.goto("/admin/payments");
      await adminPage
        .getByRole("row")
        .filter({ hasText: utr })
        .getByRole("button", { exact: true, name: "Approve" })
        .click();
      await expect
        .poll(
          async () =>
            (await (await page.request.get("/api/entitlements")).json()).canSend
        )
        .toBe(true);
      await page.goto("/");
      await expect(page.getByTestId("multimodal-input")).toBeVisible();
      await page.goto("/billing");
      await page
        .getByLabel("Reason for the refund")
        .fill("Testing the refund flow.");
      await page
        .getByRole("button", { exact: true, name: "Request a refund" })
        .click();
      await expect(page.getByText(/Awaiting review/)).toBeVisible();
      await page.reload();
      await expect(page.getByText(/Awaiting review/)).toBeVisible();
      await adminPage.goto("/admin/refunds");
      await adminPage
        .getByRole("row")
        .filter({ hasText: studentEmail })
        .getByRole("button", { name: /Mark refunded/ })
        .click();
      await expect
        .poll(
          async () =>
            (await (await page.request.get("/api/entitlements")).json()).canSend
        )
        .toBe(false);
    } finally {
      await admin.close();
    }
  }
);
