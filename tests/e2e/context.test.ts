import { expect, test } from "../fixtures";

test("saves study material, starts lesson part 1 and continues with Next part", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-sidebar="rail"]').click();
  await page.getByRole("link", { exact: true, name: "Context" }).click();
  await expect(page).toHaveURL("/context");
  await expect(
    page.getByText("Paste your study material, and Able teaches you from it.")
  ).toBeVisible();

  await page.getByRole("button", { name: "New subject" }).click();
  await page.getByRole("dialog").getByLabel("Folder name").fill("Physics");
  await page.getByRole("button", { name: "Create folder" }).click();
  await page.getByRole("link", { name: "Open subject: Physics" }).click();
  await expect(page).toHaveURL(/\/context\/[a-f0-9-]+$/);
  const folderUrl = page.url();

  const studyMaterial = page.getByRole("textbox", {
    exact: true,
    name: "Study material",
  });
  await expect(studyMaterial).toHaveAttribute("maxlength", "15000");
  await expect(page.getByText("0 / 15,000 characters")).toBeVisible();

  await page
    .getByRole("textbox", { exact: true, name: "Title" })
    .fill("Electrostatics");
  await studyMaterial.fill(
    "Coulomb's law describes the force between two electric charges."
  );
  await page.getByRole("button", { name: "Save and start lesson" }).click();

  await expect(page).toHaveURL(/\/chat\/[a-f0-9-]+$/);
  await expect(
    page.getByText(
      "Teach me this study material as a lesson. Start with part 1."
    )
  ).toBeVisible();
  await expect(page.getByTestId("message-assistant")).toBeVisible();
  await page.getByRole("button", { name: "Next part" }).click();
  await expect(
    page.getByText("Continue with the next part of this lesson.")
  ).toBeVisible();

  await page.goto(folderUrl);
  const materialRow = page.getByRole("listitem").filter({
    has: page.getByText("Electrostatics", { exact: true }),
  });
  await expect(
    materialRow.getByRole("button", { name: "Teach me" })
  ).toBeEnabled();
  await materialRow.getByRole("link").click();
  await expect(
    page.getByText("Editable for 10 minutes after saving")
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { exact: true, name: "Study material" })
  ).toHaveValue(
    "Coulomb's law describes the force between two electric charges."
  );
  await page.getByRole("link", { exact: true, name: "Back to chat" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByTestId("multimodal-input")).toBeVisible();
});

test("a Context folder cannot be deleted until it is empty", async ({
  page,
}) => {
  await page.goto("/context");
  await page.getByRole("button", { name: "New subject" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Folder name")
    .fill("Empty subject");
  await page.getByRole("button", { name: "Create folder" }).click();
  await page.getByRole("link", { name: "Open subject: Empty subject" }).click();
  await page.getByText("Folder settings").click();
  await expect(
    page.getByRole("button", { name: "Delete empty folder" })
  ).toBeEnabled();
  await page.getByRole("button", { name: "Delete empty folder" }).click();
  await expect(page).toHaveURL("/context");
  await expect(
    page.getByRole("link", { name: "Open subject: Empty subject" })
  ).toHaveCount(0);
});
