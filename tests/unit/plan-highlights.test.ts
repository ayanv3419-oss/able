import { describe, expect, it } from "vitest";
import { planCopy } from "@/lib/plan-highlights";
import { type PLAN_IDS, PLANS } from "@/lib/plans";

const lines = (id: (typeof PLAN_IDS)[number]) =>
  planCopy(id).features.map((feature) => feature.text);
const soon = (id: (typeof PLAN_IDS)[number]) =>
  planCopy(id)
    .features.filter((feature) => feature.soon)
    .map((feature) => feature.text);

describe("plans page card words", () => {
  it("keeps the owner's lines and order for every plan", () => {
    expect(lines("basic")).toEqual([
      "3 project folders",
      "Limited messages",
      "Limited PDF creation",
      "Limited uploads",
      "Limited voice input",
      "Limited deep explanations with architecture diagrams",
      "Limited understanding of you",
    ]);
    expect(lines("plus")).toEqual([
      "More messages",
      "20 project folders, each with its own instructions",
      "More uploads",
      "More voice input",
      "More deep explanations with architecture diagrams",
      "More understanding of you",
      "High-end PDF creation",
      "High-end deep research and explanations",
      "Assistant system, with limits",
    ]);
    expect(lines("pro")).toEqual([
      "Unlimited messages",
      "40 project folders",
      "Unlimited uploads",
      "Unlimited voice input",
      "Advanced deep research",
      "Advanced architecture explanations and diagrams",
      "Advanced understanding of you",
      "Advanced PDF creation",
      "High-level assistant system",
      "Thinks before it answers, for the most advanced explanations",
    ]);
    expect(planCopy("pro").tagline).toBe("Most capable");
  });

  it("marks only the unbuilt features as coming soon", () => {
    expect(soon("basic")).toEqual([]);
    expect(soon("plus")).toEqual(["Assistant system, with limits"]);
    expect(soon("pro")).toEqual(["High-level assistant system"]);
  });

  it("only promises unlimited where the plan really has no cap", () => {
    expect(lines("pro")).toContain("Unlimited uploads");
    expect(PLANS.pro.dailyUploads).toBeNull();
    expect(lines("pro")).toContain("Unlimited messages");
    expect(PLANS.pro.displayUnlimited).toBe(true);
    for (const id of ["basic", "plus"] as const) {
      expect(lines(id).some((line) => line.startsWith("Unlimited"))).toBe(
        false
      );
    }
  });
});
