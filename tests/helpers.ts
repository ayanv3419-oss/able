import type { Page } from "@playwright/test";
import { getUnixTime } from "date-fns";

export function generateTestEmail() {
  const unique = Math.random().toString(36).slice(2, 8);

  return `test-${getUnixTime(new Date())}-${unique}@playwright.com`;
}

export function generateTestMessage() {
  return `Test message ${Date.now()}`;
}

/**
 * Signs the browser in through the test-only `test-login` provider. Posting to
 * the Auth.js callback leaves the session cookie in the browser context, so
 * everything the page does afterwards is signed in as this student.
 */
export async function signInWithTestLogin(page: Page, email: string) {
  const csrfResponse = await page.request.get("/api/auth/csrf");

  if (!csrfResponse.ok()) {
    throw new Error(`Could not read a CSRF token: ${csrfResponse.status()}`);
  }

  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const response = await page.request.post("/api/auth/callback/test-login", {
    form: { callbackUrl: "/", csrfToken, email },
    maxRedirects: 0,
  });

  const location = response.headers().location ?? "";

  if (response.status() !== 302 || location.includes("error")) {
    throw new Error(
      `test-login failed for ${email}: ${response.status()} ${location}`
    );
  }
}
