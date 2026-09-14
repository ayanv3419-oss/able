// biome-ignore-all lint/performance/noAwaitInLoops: The cards are checked one after another on the same page.
import { expect, test } from "../fixtures";

const PLAN_REGION = / plan$/;
const SOON = " Coming soon";

const CARDS = {
  Basic: {
    lines: [
      "3 project folders",
      "Limited messages",
      "Limited PDF creation",
      "Limited uploads",
      "Limited voice input",
      "Limited deep explanations with architecture diagrams",
      "Limited understanding of you",
    ],
    tagline: "Everyday study help",
  },
  Plus: {
    lines: [
      "More messages",
      "20 project folders, each with its own instructions",
      "More uploads",
      "More voice input",
      "More deep explanations with architecture diagrams",
      "More understanding of you",
      "High-end PDF creation",
      "High-end deep research and explanations",
      `Assistant system, with limits${SOON}`,
    ],
    tagline: "More reasoning for harder subjects",
  },
  Pro: {
    lines: [
      "Unlimited messages",
      "40 project folders",
      "Unlimited uploads",
      "Unlimited voice input",
      "Advanced deep research",
      "Advanced architecture explanations and diagrams",
      "Advanced understanding of you",
      "Advanced PDF creation",
      `High-level assistant system${SOON}`,
      "Thinks before it answers, for the most advanced explanations",
    ],
    tagline: "Most capable",
  },
};

test("the plans page shows each plan's own lines in ChatGPT's layout", async ({
  page,
}) => {
  await page.goto("/pricing");
  for (const [name, card] of Object.entries(CARDS)) {
    const region = page.getByRole("region", {
      exact: true,
      name: `${name} plan`,
    });
    await expect(region.getByText(card.tagline, { exact: true })).toBeVisible();
    await expect(region.getByRole("listitem")).toHaveText(card.lines);
    await expect(
      region.getByRole("link", { exact: true, name: `Get ${name}` })
    ).toBeVisible();
    await expect(region.getByText("Popular", { exact: true })).toHaveCount(
      name === "Plus" ? 1 : 0
    );
  }
  await expect(page.getByText("Includes:", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/^Everything in /)).toHaveCount(0);

  const tops = await page
    .getByRole("region", { name: PLAN_REGION })
    .evaluateAll((cards) =>
      cards.map((card) => Math.round(card.getBoundingClientRect().top))
    );
  expect(tops).toHaveLength(3);
  expect(new Set(tops).size).toBe(1);
  await page.screenshot({
    fullPage: true,
    path: "test-results/pricing-desktop.png",
  });

  await page.setViewportSize({ height: 844, width: 390 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
  await page.screenshot({
    fullPage: true,
    path: "test-results/pricing-phone.png",
  });
});
