import { expect, test } from "@playwright/test";
import { test as signedInTest } from "../fixtures";

const LEGAL_LINKS = [
  ["Terms", "/terms"],
  ["Privacy", "/privacy"],
  ["Refunds", "/refunds"],
  ["Contact", "/contact"],
] as const;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test.describe("Login page", () => {
  test("offers Google as the only way in", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Able" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with Google" })
    ).toBeVisible();
    await expect(page.getByRole("main").getByRole("button")).toHaveCount(1);
    await expect(page.getByLabel("Email")).toHaveCount(0);
    await expect(page.getByLabel("Password")).toHaveCount(0);
  });

  test("links to the legal pages", async ({ page }) => {
    await page.goto("/login");

    await Promise.all(
      LEGAL_LINKS.map(([label, href]) =>
        expect(page.getByRole("link", { name: label })).toHaveAttribute(
          "href",
          href
        )
      )
    );
  });

  test("no longer serves a register page", async ({ page }) => {
    const response = await page.goto("/register");

    expect(response?.status()).toBe(404);
  });
});

test.describe("Access rules", () => {
  test("sends a signed-out visitor to login with the target", async ({
    page,
  }) => {
    await page.goto("/chat/a1b2c3");

    await expect(page).toHaveURL("/login?callbackUrl=%2Fchat%2Fa1b2c3");
  });

  test("answers a signed-out API call with 401 JSON", async ({ page }) => {
    const response = await page.request.get("/api/history", {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "unauthorized:auth",
    });
  });
});

signedInTest.describe("Signed-in visitors", () => {
  signedInTest("are sent from login to the chat", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveURL("/");
  });

  signedInTest(
    "get a session for the student who signed in",
    async ({ page, studentEmail }) => {
      const response = await page.request.get("/api/auth/session");
      const session = (await response.json()) as {
        user?: { email?: string; id?: string };
      };

      expect(session.user?.email).toBe(studentEmail);
      expect(session.user?.id).toMatch(UUID_REGEX);
    }
  );
});
