import { expect, test } from "../fixtures";

const CHAT_URL_REGEX = /\/chat\/[\w-]+/;

test.describe("Chat API Integration", () => {
  test("sends message and receives AI response", async ({ page }) => {
    await page.goto("/");

    const input = page.getByTestId("multimodal-input");
    await input.fill("Hello");
    await page.getByTestId("send-button").click();

    // Wait for assistant response to appear
    const assistantMessage = page.locator("[data-role='assistant']").first();
    await expect(assistantMessage).toBeVisible({ timeout: 30_000 });

    // Verify it has some text content
    const content = await assistantMessage.textContent();
    expect(content?.length).toBeGreaterThan(0);
  });

  test("redirects to /chat/:id after sending message", async ({ page }) => {
    await page.goto("/");

    const input = page.getByTestId("multimodal-input");
    await input.fill("Test redirect");
    await page.getByTestId("send-button").click();

    // URL should change to /chat/:id format
    await expect(page).toHaveURL(CHAT_URL_REGEX, { timeout: 10_000 });
  });

  test("clears input after sending", async ({ page }) => {
    await page.goto("/");

    const input = page.getByTestId("multimodal-input");
    await input.fill("Test message");
    await page.getByTestId("send-button").click();

    // Input should be cleared
    await expect(input).toHaveValue("");
  });

  test("shows stop button during generation", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("multimodal-input");
    await input.fill("Test");
    await page.getByTestId("send-button").click();

    // Stop button should appear during generation
    const stopButton = page.getByTestId("stop-button");
    await expect(stopButton).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Chat Error Handling", () => {
  test("handles API error gracefully", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          code: "offline:chat",
          message: "We're having trouble sending your message.",
        }),
        contentType: "application/json",
        status: 503,
      });
    });

    await page.goto("/");
    const input = page.getByTestId("multimodal-input");
    await input.fill("Hello");
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/chat") && response.status() === 503
      ),
      page.getByTestId("send-button").click(),
    ]);

    // Should show error toast or message
    await expect(
      page
        .locator("[data-sonner-toast]")
        .filter({ hasText: "trouble sending your message" })
    ).toBeVisible();
  });
});

test.describe("Suggested Actions", () => {
  test("suggested actions are clickable", async ({ page }) => {
    await page.goto("/");

    const suggestions = page.locator(
      "[data-testid='suggested-actions'] button"
    );
    await expect(suggestions).toHaveCount(4);
    await suggestions.first().click();

    // Should redirect after clicking suggestion
    await expect(page).toHaveURL(CHAT_URL_REGEX, { timeout: 10_000 });
  });
});
