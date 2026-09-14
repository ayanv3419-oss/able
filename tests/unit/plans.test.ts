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
      contextMemories: 3,
      dailyMessages: 40,
      dailyPdfs: 5,
      dailyUploads: 5,
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
      contextMemories: 6,
      dailyMessages: 100,
      dailyPdfs: 20,
      dailyUploads: 20,
      displayUnlimited: false,
      id: "plus",
      name: "Plus",
      priceInr: 800,
      priceUsdDisplay: "$8.99",
      projectFolderLimit: 20,
      reasoningEffort: "medium",
    });
  });

  it("shows Pro as unlimited but keeps a 150 message ceiling and 40 folders", () => {
    expect(PLANS.pro).toEqual({
      contextMemories: 10,
      dailyMessages: 150,
      dailyPdfs: 50,
      dailyUploads: null,
      displayUnlimited: true,
      id: "pro",
      name: "Pro",
      priceInr: 1200,
      priceUsdDisplay: "$12.99",
      projectFolderLimit: 40,
      reasoningEffort: "high",
    });
  });

  it("gives each higher plan more of every limit", () => {
    expect(PLANS.basic.dailyMessages).toBeLessThan(PLANS.plus.dailyMessages);
    expect(PLANS.plus.dailyMessages).toBeLessThan(PLANS.pro.dailyMessages);
    expect(PLANS.basic.contextMemories).toBeLessThan(
      PLANS.plus.contextMemories
    );
    expect(PLANS.plus.contextMemories).toBeLessThan(PLANS.pro.contextMemories);
    expect(PLANS.basic.dailyUploads).toBeLessThan(PLANS.plus.dailyUploads ?? 0);
    expect(PLANS.pro.dailyUploads).toBeNull();
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
