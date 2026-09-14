import { expect, test } from "@playwright/test";
import { generateTestEmail, signInWithTestLogin } from "../helpers";

const REQUEST_BUTTON = "I've paid — send request";

test("the owner allows or rejects requests, and rejecting blocks until unblocked", async ({
  page,
  browser,
}) => {
  const email = generateTestEmail();
  await signInWithTestLogin(page, email);

  // A student without a plan starts on the plan page.
  await page.goto("/");
  await expect(page).toHaveURL(/\/pricing$/);
  expect((await page.request.get("/api/admin/payments/count")).status()).toBe(
    403
  );

  await page.goto("/pay/plus");
  await expect(page.getByLabel("UPI reference number (UTR)")).toHaveCount(0);
  await page.getByRole("button", { name: REQUEST_BUTTON }).click();
  await expect(page).toHaveURL(/\/waiting$/);
  await expect(
    page.getByText("Waiting for approval", { exact: true })
  ).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/waiting$/);

  const admin = await browser.newContext();
  try {
    const adminPage = await admin.newPage();
    await signInWithTestLogin(adminPage, "admin@able.test");
    await adminPage.goto("/");
    const { count } = await (
      await adminPage.request.get("/api/admin/payments/count")
    ).json();
    expect(count).toBeGreaterThan(0);
    await adminPage.getByTestId("user-nav-button").click();
    await adminPage
      .getByRole("menuitem", { exact: true, name: `Admin · ${count}` })
      .click();
    await expect(adminPage).toHaveURL(/\/admin\/payments$/);
    const row = adminPage.getByRole("row").filter({ hasText: email });
    await expect(row).toContainText("New: Plus until");
    await expect(row).toContainText("Note: Able plus");
    await adminPage.screenshot({
      fullPage: true,
      path: "test-results/requests-desktop.png",
    });

    // On a phone, Reject asks first, then blocks the student.
    await adminPage.setViewportSize({ height: 812, width: 375 });
    const card = adminPage.getByRole("article", {
      exact: true,
      name: `Request from ${email}`,
    });
    await expect(card).toBeVisible();
    expect(
      await adminPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
    const allowBox = await card
      .getByRole("button", { exact: true, name: "Allow" })
      .boundingBox();
    expect(allowBox?.height).toBeGreaterThanOrEqual(44);
    const confirm = adminPage.getByRole("alertdialog");
    await card.getByRole("button", { exact: true, name: "Reject" }).click();
    await confirm.getByRole("button", { exact: true, name: "Keep it" }).click();
    await expect(confirm).toHaveCount(0);
    await expect(card).toBeVisible();
    const actionRequest = adminPage.waitForRequest(
      (request) =>
        request.method() === "POST" && Boolean(request.headers()["next-action"])
    );
    await card.getByRole("button", { exact: true, name: "Reject" }).click();
    await confirm
      .getByRole("button", { exact: true, name: "Reject and block" })
      .click();
    const captured = await actionRequest;
    await expect(card).toHaveCount(0);
    await adminPage.screenshot({
      fullPage: true,
      path: "test-results/requests-phone.png",
    });

    // The student is blocked everywhere until the owner unblocks them.
    await page.goto("/");
    await expect(page).toHaveURL(/\/blocked$/);
    await expect(
      page.getByRole("heading", { name: "Request rejected" })
    ).toBeVisible();
    await page.goto("/pay/basic");
    await expect(page).toHaveURL(/\/blocked$/);
    expect(
      (
        await page.request.post("/api/payments", { data: { planId: "basic" } })
      ).status()
    ).toBe(403);
    expect(
      (await (await page.request.get("/api/entitlements")).json()).status
    ).toBe("blocked");
    // Replay the owner's server action as the student; the server re-checks.
    const forged = await page.request.post("/admin/payments", {
      data: captured.postDataBuffer() ?? Buffer.alloc(0),
      headers: {
        "Content-Type": captured.headers()["content-type"],
        "Next-Action": captured.headers()["next-action"],
      },
    });
    expect(await forged.text()).toContain("Your account does not have access");

    await adminPage.setViewportSize({ height: 1000, width: 1440 });
    await adminPage.reload();
    const blockedItem = adminPage
      .getByRole("listitem")
      .filter({ hasText: email });
    await blockedItem
      .getByRole("button", { exact: true, name: "Unblock" })
      .click();
    await expect(blockedItem).toHaveCount(0);

    // Unblocked, the student starts again from the plan page and is allowed.
    await page.goto("/");
    await expect(page).toHaveURL(/\/pricing$/);
    await page.goto("/pay/basic");
    await page.getByRole("button", { name: REQUEST_BUTTON }).click();
    await expect(page).toHaveURL(/\/waiting$/);
    await adminPage.reload();
    const pendingRow = adminPage
      .getByRole("row")
      .filter({ hasText: email })
      .filter({
        has: adminPage.getByRole("button", { exact: true, name: "Allow" }),
      });
    await expect(pendingRow).toContainText("New: Basic until");
    await pendingRow
      .getByRole("button", { exact: true, name: "Allow" })
      .click();
    await expect(pendingRow).toHaveCount(0);

    // The waiting screen notices the decision and opens the chat.
    await expect(page).toHaveURL(/\/$/, { timeout: 40_000 });
    await expect(page.getByTestId("multimodal-input")).toBeVisible();
    expect(
      (await (await page.request.get("/api/entitlements")).json()).planId
    ).toBe("basic");
  } finally {
    await admin.close();
  }
});
