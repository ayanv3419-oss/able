// biome-ignore-all lint/performance/noAwaitInLoops: Navigation steps share one browser page and must run in order.
import { randomUUID } from "node:crypto";
import { test as anonymousTest, type Locator } from "@playwright/test";
import { expect, test } from "../fixtures";
import { generateTestEmail, signInWithTestLogin } from "../helpers";
import {
  projectChatIds,
  seedProjectNavigation,
  seedProjects,
} from "../project-db";

/** How many folders sit on the first row of the Projects grid. */
async function foldersPerRow(grid: Locator) {
  const tops = await grid
    .getByRole("listitem")
    .evaluateAll((items) =>
      items.map((item) => Math.round(item.getBoundingClientRect().top))
    );
  return tops.filter((top) => top === tops[0]).length;
}

/** How many lines of text an element shows. */
async function shownLines(element: Locator) {
  return await element.evaluate((node) => {
    const lineHeight = Number.parseFloat(getComputedStyle(node).lineHeight);
    return Math.round(node.getBoundingClientRect().height / lineHeight);
  });
}

test("the sidebar shows one Projects entry that opens the Projects page", async ({
  page,
  studentEmail,
}) => {
  const data = await seedProjectNavigation(studentEmail);
  await page.goto("/");
  await page.locator('[data-sidebar="rail"]').click();
  const sidebar = page.locator('[data-sidebar="sidebar"]');
  await expect(sidebar.getByText(data.name, { exact: true })).toHaveCount(0);
  await expect(
    sidebar.getByRole("button", { name: "New project" })
  ).toHaveCount(0);
  await sidebar.getByRole("link", { exact: true, name: "Projects" }).click();
  await expect(page).toHaveURL("/projects");
  await expect(
    page.getByRole("link", { exact: true, name: `Open project: ${data.name}` })
  ).toBeVisible();
});

test("the Projects page shows folders A to Z, each with a menu to rename or delete it", async ({
  page,
  studentEmail,
}) => {
  const longName = "Semester 1 practical files and viva preparation notes";
  // Oldest first, so the old most-recent-first order would differ from A to Z.
  await seedProjects(studentEmail, [
    "Zoology",
    longName,
    "Physics",
    "Maths 10",
    "Maths 2",
    "History",
    "algebra",
  ]);
  await page.goto("/projects");
  await page.mouse.move(0, 0);
  const grid = page.getByRole("list", { name: "Your projects" });
  const folders = grid.getByRole("link");
  await expect(folders).toHaveText([
    "algebra",
    "History",
    "Maths 2",
    "Maths 10",
    "Physics",
    longName,
    "Zoology",
  ]);
  await expect(grid.getByText(/conversation/i)).toHaveCount(0);
  expect(await foldersPerRow(grid)).toBe(5);
  const long = grid.getByRole("link", {
    exact: true,
    name: `Open project: ${longName}`,
  });
  await expect(long).toHaveAttribute("title", longName);
  expect(await shownLines(long.locator("span"))).toBe(2);

  const zoology = grid.getByRole("listitem").filter({
    has: page.getByRole("link", { exact: true, name: "Open project: Zoology" }),
  });
  const zoologyOptions = zoology.getByRole("button", {
    exact: true,
    name: "Options for Zoology",
  });
  await expect(zoologyOptions).toBeEnabled();
  await expect(zoologyOptions).toHaveCSS("opacity", "0");
  await zoology.hover();
  await expect(zoologyOptions).toHaveCSS("opacity", "1");
  await page.screenshot({ path: "test-results/projects-grid-desktop.png" });
  await zoologyOptions.click();
  await page
    .getByRole("menuitem", { exact: true, name: "Rename project" })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Name", { exact: true })
    .fill("Botany");
  await page
    .getByRole("dialog")
    .getByRole("button", { exact: true, name: "Save" })
    .click();
  await expect(folders).toHaveText([
    "algebra",
    "Botany",
    "History",
    "Maths 2",
    "Maths 10",
    "Physics",
    longName,
  ]);
  await expect(page).toHaveURL("/projects");

  await grid
    .getByRole("button", { exact: true, name: "Options for algebra" })
    .click();
  await page
    .getByRole("menuitem", { exact: true, name: "Delete project" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { exact: true, name: "Delete" })
    .click();
  await expect(folders).toHaveText([
    "Botany",
    "History",
    "Maths 2",
    "Maths 10",
    "Physics",
    longName,
  ]);
  await expect(page).toHaveURL("/projects");

  await page.setViewportSize({ height: 844, width: 390 });
  expect(await foldersPerRow(grid)).toBe(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
  await page.screenshot({
    fullPage: true,
    path: "test-results/projects-grid-phone.png",
  });
});

test("opens Projects, a project's conversations and the existing saved chat", async ({
  page,
  studentEmail,
}) => {
  const data = await seedProjectNavigation(studentEmail);
  await page.goto("/projects");
  await page
    .getByRole("link", { exact: true, name: `Open project: ${data.name}` })
    .click();
  await expect(page).toHaveURL(`/project/${data.projectId}`);
  await expect(
    page.getByRole("heading", { exact: true, name: data.name })
  ).toBeVisible();
  await expect(
    page
      .getByRole("list", { name: "Project conversations" })
      .getByRole("listitem")
  ).toHaveCount(1);
  await expect(page.locator("time")).toHaveAttribute(
    "datetime",
    "2026-09-10T10:00:00.000Z"
  );
  await expect(page.getByText("Unfiled notes", { exact: true })).toHaveCount(0);
  await page.getByText("Project instructions", { exact: true }).click();
  await expect(page.getByLabel("Instructions", { exact: true })).toHaveValue(
    "Use SI units."
  );
  await page.screenshot({
    fullPage: true,
    path: "test-results/project-folder-desktop.png",
  });
  await page
    .getByRole("link", { exact: true, name: "Open chat: Cell division notes" })
    .click();
  await expect(page).toHaveURL(`/chat/${data.chatId}`);
  await expect(
    page.getByText("These are my saved cell division notes.", { exact: true })
  ).toBeVisible();
  expect(await projectChatIds(data.projectId)).toEqual([data.chatId]);
});

test("shows empty states, creates a chat in the project and preserves it after project deletion", async ({
  page,
}) => {
  await page.goto("/projects");
  await expect(
    page.getByRole("heading", { name: "No projects yet" })
  ).toBeVisible();
  await page.getByRole("button", { exact: true, name: "New project" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Name", { exact: true })
    .fill("Revision folder");
  await page
    .getByRole("button", { exact: true, name: "Create project" })
    .click();
  await page
    .getByRole("link", { exact: true, name: "Open project: Revision folder" })
    .click();
  await expect(page).toHaveURL(/\/project\/[a-f0-9-]+$/);
  const id = page.url().split("/").at(-1);
  if (!id) {
    throw new Error("Project navigation did not provide an ID");
  }
  await expect(
    page.getByRole("heading", { name: "No conversations yet" })
  ).toBeVisible();
  await page
    .getByRole("button", { exact: true, name: "New chat in this project" })
    .click();
  await expect(page).toHaveURL(/\/chat\/[a-f0-9-]+$/);
  const chatId = page.url().split("/").at(-1);
  if (!chatId) {
    throw new Error("Chat navigation did not provide an ID");
  }
  expect(await projectChatIds(id)).toEqual([chatId]);
  await page.goto(`/project/${id}`);
  await page
    .getByRole("button", { exact: true, name: "Project options" })
    .click();
  await page
    .getByRole("menuitem", { exact: true, name: "Rename project" })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Name", { exact: true })
    .fill("Renamed revision");
  await page
    .getByRole("dialog")
    .getByRole("button", { exact: true, name: "Save" })
    .click();
  await expect(
    page.getByRole("heading", { exact: true, name: "Renamed revision" })
  ).toBeVisible();
  await page
    .getByRole("button", { exact: true, name: "Project options" })
    .click();
  await page
    .getByRole("menuitem", { exact: true, name: "Delete project" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { exact: true, name: "Delete" })
    .click();
  await expect(page).toHaveURL("/projects");
  const saved = await page.request.get(`/api/messages?chatId=${chatId}`);
  expect(saved.status()).toBe(200);
  expect((await saved.json()).userId).toBeTruthy();
  expect(await projectChatIds(id)).toEqual([]);
});

test("blocks foreign, missing and malformed project URLs without exposing chats", async ({
  page,
  studentEmail,
  browser,
}) => {
  const data = await seedProjectNavigation(studentEmail);
  const stranger = await browser.newContext();
  try {
    const otherPage = await stranger.newPage();
    const strangerEmail = generateTestEmail();
    await signInWithTestLogin(otherPage, strangerEmail);
    // A stranger without a plan would be sent to the plan page first.
    const { seedPaidStudent } = await import("../db");
    await seedPaidStudent(strangerEmail);
    for (const id of [data.projectId, randomUUID(), "not-a-project-id"]) {
      for (const suffix of ["", "/folder"]) {
        await otherPage.goto(`/project/${id}${suffix}`);
        await expect(
          otherPage.getByRole("heading", {
            exact: true,
            name: "Project not found",
          })
        ).toBeVisible();
        await expect(
          otherPage.getByText(data.name, { exact: true })
        ).toHaveCount(0);
        const response = await otherPage.request.get(`/project/${id}${suffix}`);
        const body = await response.text();
        expect(body).not.toContain("Cell division notes");
        expect(body).not.toContain("Use SI units.");
      }
    }
    expect(
      (
        await otherPage.request.get(`/api/messages?chatId=${data.chatId}`)
      ).status()
    ).toBe(403);
  } finally {
    await stranger.close();
  }
  await page.goto(`/project/${data.projectId}/folder`);
  await expect(page).toHaveURL(`/project/${data.projectId}`);
  await expect(
    page.getByRole("link", { name: "Open chat: Cell division notes" })
  ).toBeVisible();
});

test("project navigation works on a phone in light and dark themes", async ({
  page,
  studentEmail,
}) => {
  const data = await seedProjectNavigation(studentEmail);
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/projects");
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => localStorage.setItem("theme", value), theme);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(new RegExp(theme));
    await page
      .getByRole("link", { exact: true, name: `Open project: ${data.name}` })
      .click();
    await expect(
      page.getByRole("link", { name: "Open chat: Cell division notes" })
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
    await page.screenshot({
      fullPage: true,
      path: `test-results/project-folder-${theme}.png`,
    });
    await page
      .getByRole("link", { exact: true, name: "Back to projects" })
      .click();
    await expect(page).toHaveURL("/projects");
  }
});

test("moving and removing a chat refreshes its folder and sidebar menu", async ({
  page,
  studentEmail,
}) => {
  const data = await seedProjectNavigation(studentEmail);
  await page.goto(`/chat/${data.chatId}`);
  await page.locator('[data-sidebar="rail"]').click();
  const row = page.locator('[data-sidebar="menu-item"]').filter({
    has: page.getByRole("link", { exact: true, name: "Cell division notes" }),
  });
  await row.getByRole("button", { exact: true, name: "More" }).click();
  await page
    .getByRole("menuitem", { exact: true, name: "Move to project" })
    .hover();
  await page
    .getByRole("menuitem", { exact: true, name: data.emptyName })
    .click();
  await expect(
    page.getByText("Chat moved to project", { exact: true })
  ).toBeVisible();
  expect(await projectChatIds(data.projectId)).toEqual([]);
  expect(await projectChatIds(data.emptyId)).toEqual([data.chatId]);
  await row.getByRole("button", { exact: true, name: "More" }).click();
  await page
    .getByRole("menuitem", { exact: true, name: "Remove from project" })
    .click();
  await expect(
    page.getByText("Chat removed from project", { exact: true })
  ).toBeVisible();
  expect(await projectChatIds(data.emptyId)).toEqual([]);
  await row.getByRole("button", { exact: true, name: "More" }).click();
  await expect(
    page.getByRole("menuitem", { exact: true, name: "Remove from project" })
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.goto(`/project/${data.emptyId}`);
  await expect(
    page.getByRole("heading", { name: "No conversations yet" })
  ).toBeVisible();
});

anonymousTest(
  "project routes require sign-in outside the local preview",
  async ({ page }) => {
    for (const path of [
      "/projects",
      `/project/${randomUUID()}`,
      `/project/${randomUUID()}/folder`,
    ]) {
      const response = await page.request.get(path, { maxRedirects: 0 });
      expect([302, 307]).toContain(response.status());
      expect(response.headers().location).toContain("/login");
    }
  }
);
