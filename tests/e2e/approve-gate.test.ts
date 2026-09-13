import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PAYMENT_REJECTION_MESSAGE } from "@/lib/billing/rules";
import { generateTestEmail, signInWithTestLogin } from "../helpers";

test("admin-only queue reviews payments on phone and desktop and grants only the paid plan", async ({
  page,
  browser,
}) => {
  const email = generateTestEmail();
  await signInWithTestLogin(page, email);
  await page.goto("/");
  await page.getByTestId("user-nav-button").click();
  await expect(page.getByRole("menuitem", { name: /^Admin/ })).toHaveCount(0);
  expect((await page.request.get("/api/admin/payments/count")).status()).toBe(
    403
  );

  const utr = randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase();
  await page.goto("/pay/plus");
  await expect(page.getByLabel("Note for the owner (optional)")).toHaveCount(0);
  await page.getByLabel("UPI reference number (UTR)").fill(utr);
  await page
    .getByRole("button", { name: "I've paid — submit reference number" })
    .click();
  await expect(page).toHaveURL(/\/billing$/);

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
    const row = adminPage.getByRole("row").filter({ hasText: utr });
    await expect(row).toContainText("New: Plus until");
    await expect(row.getByRole("textbox")).toHaveCount(0);
    await adminPage.screenshot({
      fullPage: true,
      path: "test-results/approve-gate-desktop.png",
    });

    await adminPage.setViewportSize({ height: 812, width: 375 });
    const card = adminPage.getByRole("article", {
      exact: true,
      name: `Payment from ${email}`,
    });
    await expect(card).toBeVisible();
    expect(
      await adminPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
    const approveBox = await card
      .getByRole("button", { exact: true, name: "Approve" })
      .boundingBox();
    expect(approveBox?.height).toBeGreaterThanOrEqual(44);
    await adminPage.screenshot({
      fullPage: true,
      path: "test-results/approve-gate-phone.png",
    });
    const actionRequest = adminPage.waitForRequest(
      (request) =>
        request.method() === "POST" && Boolean(request.headers()["next-action"])
    );
    await card.getByRole("button", { exact: true, name: "Reject" }).click();
    const captured = await actionRequest;
    await expect(card).toHaveCount(0);
    expect(
      (await (await adminPage.request.get("/api/admin/payments/count")).json())
        .count
    ).toBe(count - 1);
    await page.reload();
    await expect(
      page.getByText(PAYMENT_REJECTION_MESSAGE, { exact: true })
    ).toBeVisible();

    await page.goto("/pay/basic");
    await page.getByLabel("UPI reference number (UTR)").fill(utr.toLowerCase());
    await page
      .getByRole("button", { name: "I've paid — submit reference number" })
      .click();
    await expect(page).toHaveURL(/\/billing$/);
    // Replay a real server action as a student; the server must re-check access.
    const forged = await page.request.post("/admin/payments", {
      data: captured.postDataBuffer() ?? Buffer.alloc(0),
      headers: {
        "Content-Type": captured.headers()["content-type"],
        "Next-Action": captured.headers()["next-action"],
      },
    });
    expect(await forged.text()).toContain("Your account does not have access");
    expect(
      (await (await page.request.get("/api/entitlements")).json()).canSend
    ).toBe(false);

    await adminPage.setViewportSize({ height: 1000, width: 1440 });
    await adminPage.reload();
    const pendingRow = adminPage
      .getByRole("row")
      .filter({ hasText: utr })
      .filter({
        has: adminPage.getByRole("button", { exact: true, name: "Approve" }),
      });
    await expect(pendingRow).toContainText("New: Basic until");
    await pendingRow
      .getByRole("button", { exact: true, name: "Approve" })
      .click();
    await expect(pendingRow).toHaveCount(0);
    await expect
      .poll(
        async () =>
          (await (await page.request.get("/api/entitlements")).json()).planId
      )
      .toBe("basic");

    async function approveNextPlan(planId: "basic" | "plus") {
      const reference = randomUUID()
        .replaceAll("-", "")
        .slice(0, 24)
        .toUpperCase();
      expect(
        (
          await page.request.post("/api/payments", {
            data: { planId, utr: reference },
          })
        ).status()
      ).toBe(201);
      await adminPage.reload();
      const nextRow = adminPage.getByRole("row").filter({ hasText: reference });
      await expect(nextRow).toContainText(
        planId === "basic"
          ? "Adds 30 days to Basic"
          : "Switches Basic to Plus now"
      );
      if (planId === "plus") {
        await expect(nextRow).toContainText(
          "60 paid days on the old plan will be lost"
        );
      }
      await nextRow
        .getByRole("button", { exact: true, name: "Approve" })
        .click();
      await expect(
        nextRow.getByRole("button", { exact: true, name: "Approve" })
      ).toHaveCount(0);
      await expect(adminPage.getByRole("dialog")).toHaveCount(0);
    }
    await approveNextPlan("basic");
    await approveNextPlan("plus");
    await expect
      .poll(
        async () =>
          (await (await page.request.get("/api/entitlements")).json()).planId
      )
      .toBe("plus");
  } finally {
    await admin.close();
  }
});
