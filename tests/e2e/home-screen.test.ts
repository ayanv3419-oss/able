import { setPlanEndsInDays } from "../db";
import { expect, test } from "../fixtures";

/** Today at the given hour on this machine's clock, which the browser shares. */
function todayAt(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date;
}

test("an empty chat greets the student by name with the suggestions right under it", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.getByLabel("Name or nickname", { exact: true }).fill("Ayan");
  await page.getByRole("button", { exact: true, name: "Save profile" }).click();
  await expect(page.getByText("Profile saved", { exact: true })).toBeVisible();

  await page.clock.setFixedTime(todayAt(20));
  await page.goto("/");
  const greeting = page.getByRole("heading", {
    exact: true,
    level: 1,
    name: "Good evening, Ayan",
  });
  await expect(greeting).toBeVisible();
  await expect(page.getByText("What are we working on?")).toHaveCount(0);
  await expect(
    page.getByText(/Ask Able anything, from explaining/)
  ).toHaveCount(0);

  const suggestions = page.getByTestId("suggested-actions");
  await expect(suggestions.getByRole("button")).toHaveCount(4);
  const heading = await greeting.boundingBox();
  const list = await suggestions.boundingBox();
  const composer = await page.getByTestId("multimodal-input").boundingBox();
  if (!(heading && list && composer)) {
    throw new Error("The home screen is not laid out");
  }
  const headingBottom = heading.y + heading.height;
  expect(list.y).toBeGreaterThan(headingBottom);
  expect(list.y - headingBottom).toBeLessThan(64);
  expect(list.y + list.height).toBeLessThan(composer.y - 40);
  await page.screenshot({ path: "test-results/home-screen-desktop.png" });

  await page.clock.setFixedTime(todayAt(8));
  await page.reload();
  await expect(
    page.getByRole("heading", {
      exact: true,
      level: 1,
      name: "Good morning, Ayan",
    })
  ).toBeVisible();
});

test("the chat screen has no sharing lock, no delete-all and no usage card on a normal day", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByTestId("multimodal-input");
  await expect(input).toBeVisible();
  await expect(page.getByTestId("visibility-selector")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /delete all/i })).toHaveCount(
    0
  );
  await expect(page.getByRole("region", { name: "Plan usage" })).toHaveCount(0);
  await expect(page.getByText(/left today|plan ends/i)).toHaveCount(0);

  await input.fill("/");
  await expect(
    page.getByText("Start a new chat", { exact: true })
  ).toBeVisible();
  await expect(page.getByText("/purge", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Delete all chats", { exact: true })).toHaveCount(
    0
  );
  expect((await page.request.delete("/api/history")).status()).toBe(405);
});

test("one line with Renew appears above the message box when the plan ends soon", async ({
  page,
  studentEmail,
}) => {
  await setPlanEndsInDays(studentEmail, 2);
  await page.goto("/");
  const notice = page
    .getByRole("status")
    .filter({ hasText: "Your plan ends in 2 days." });
  await expect(notice).toBeVisible();
  await expect(notice.getByRole("link", { name: "Renew" })).toHaveAttribute(
    "href",
    "/pricing"
  );
  const line = await notice.boundingBox();
  const composer = await page.getByTestId("multimodal-input").boundingBox();
  if (!(line && composer)) {
    throw new Error("The plan notice is not laid out");
  }
  expect(line.y + line.height).toBeLessThanOrEqual(composer.y);
  await expect(page.getByRole("region", { name: "Plan usage" })).toHaveCount(0);
});
