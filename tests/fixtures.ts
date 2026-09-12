import { expect as baseExpect, test as baseTest } from "@playwright/test";
import { seedPaidStudent } from "./db";
import { generateTestEmail, signInWithTestLogin } from "./helpers";
import { ChatPage } from "./pages/chat";

type Fixtures = {
  chatPage: ChatPage;
  studentEmail: string;
};

/**
 * `page` arrives signed in through the test-only provider, because every page
 * but the login and legal pages needs a student. Tests that want a signed-out
 * browser import `test` from @playwright/test instead.
 */
export const test = baseTest.extend<Fixtures>({
  chatPage: async ({ page }, use) => {
    await use(new ChatPage(page));
  },
  page: async ({ page, studentEmail }, use) => {
    await signInWithTestLogin(page, studentEmail);
    await seedPaidStudent(studentEmail);
    await use(page);
  },
  studentEmail: async ({ baseURL: _baseURL }, use) => {
    await use(generateTestEmail());
  },
});

export const expect = baseExpect;
