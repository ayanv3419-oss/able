import { expect, test } from "@playwright/test";

test.describe("download page", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("is public and exposes install assets", async ({ page, request }) => {
    await page.goto("/download");

    await expect(
      page.getByRole("heading", {
        name: "Your best study space, one tap away.",
      })
    ).toBeVisible();
    await expect(page.getByText("Internet required")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /install steps|install able/i }).first()
    ).toBeVisible();

    const manifestResponse = await request.get("/manifest.webmanifest");
    expect(manifestResponse.ok()).toBe(true);
    expect(await manifestResponse.json()).toMatchObject({
      display: "standalone",
      name: "Able — AI for students",
      short_name: "Able",
    });

    const workerResponse = await request.get("/sw.js");
    expect(workerResponse.ok()).toBe(true);
  });

  test("fits a phone viewport without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto("/download");

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
    await expect(page.getByText("iPhone & iPad")).toBeVisible();
  });
});
