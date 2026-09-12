import { describe, expect, it } from "vitest";
import { getPlan, isPlanId, PLAN_DAYS, PLAN_IDS, PLANS } from "@/lib/plans";

describe("plans", () => {
  it("has the three plans from the spec, in order", () => {
    expect(PLAN_IDS).toEqual(["basic", "plus", "pro"]);
  });

  it("runs every plan for 30 days", () => {
    expect(PLAN_DAYS).toBe(30);
  });

  it("prices Basic at 250 rupees with low reasoning", () => {
    expect(PLANS.basic).toEqual({
      dailyMessages: 40,
      displayUnlimited: false,
      id: "basic",
      name: "Basic",
      priceInr: 250,
      priceUsdDisplay: "$2.99",
      projectFolderLimit: 3,
      reasoningEffort: "low",
    });
  });

  it("prices Plus at 800 rupees with medium reasoning", () => {
    expect(PLANS.plus).toEqual({
      dailyMessages: 100,
      displayUnlimited: false,
      id: "plus",
      name: "Plus",
      priceInr: 800,
      priceUsdDisplay: "$8.99",
      projectFolderLimit: 20,
      reasoningEffort: "medium",
    });
  });

  it("shows Pro as unlimited but keeps a 150 message ceiling", () => {
    expect(PLANS.pro).toEqual({
      dailyMessages: 150,
      displayUnlimited: true,
      id: "pro",
      name: "Pro",
      priceInr: 1200,
      priceUsdDisplay: "$12.99",
      projectFolderLimit: null,
      reasoningEffort: "high",
    });
  });

  it("recognises plan ids and rejects anything else", () => {
    expect(isPlanId("basic")).toBe(true);
    expect(isPlanId("plus")).toBe(true);
    expect(isPlanId("pro")).toBe(true);
    expect(isPlanId("BASIC")).toBe(false);
    expect(isPlanId("free")).toBe(false);
    expect(isPlanId("")).toBe(false);
    expect(isPlanId(null)).toBe(false);
    expect(isPlanId(undefined)).toBe(false);
    expect(isPlanId(1)).toBe(false);
  });

  it("looks up a plan by id", () => {
    expect(getPlan("pro").name).toBe("Pro");
    expect(getPlan("basic")).toBe(PLANS.basic);
  });
});
