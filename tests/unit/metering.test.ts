import { describe, expect, it } from "vitest";
import {
  costMicros,
  dailyBudgetMicros,
  INR_PER_USD,
  istDayStart,
  messagesLeft,
  referenceCostMicros,
} from "@/lib/metering";
import { PLANS } from "@/lib/plans";

describe("costMicros", () => {
  it("charges a million input tokens at 15 cents", () => {
    expect(costMicros({ inputTokens: 1_000_000, model: "chat" })).toBe(150_000);
  });

  it("charges cached input at half price", () => {
    expect(costMicros({ cachedInputTokens: 1_000_000, model: "chat" })).toBe(
      75_000
    );
  });

  it("charges output, reasoning included, at 60 cents", () => {
    expect(costMicros({ model: "chat", outputTokens: 1_000_000 })).toBe(
      600_000
    );
  });

  it("adds every part of one request", () => {
    expect(
      costMicros({
        cachedInputTokens: 2000,
        inputTokens: 3000,
        model: "chat",
        outputTokens: 1500,
      })
    ).toBe(450 + 150 + 900);
  });

  it("charges 5,000 micros per web search", () => {
    expect(costMicros({ model: "chat", webSearches: 2 })).toBe(10_000);
  });

  it("charges an hour of audio at 4 cents", () => {
    expect(costMicros({ audioSeconds: 3600, model: "chat" })).toBe(40_000);
  });

  it("rounds part-micros up", () => {
    expect(costMicros({ inputTokens: 1, model: "chat" })).toBe(1);
    expect(costMicros({ audioSeconds: 60, model: "chat" })).toBe(667);
  });

  it("treats missing numbers as zero", () => {
    expect(costMicros({ model: "chat" })).toBe(0);
    expect(
      costMicros({ inputTokens: undefined, model: "chat", outputTokens: 100 })
    ).toBe(60);
  });

  it("uses the cheaper title prices for titles", () => {
    expect(costMicros({ inputTokens: 1_000_000, model: "title" })).toBe(50_000);
    expect(costMicros({ model: "title", outputTokens: 1_000_000 })).toBe(
      80_000
    );
  });
});

describe("reference costs and budgets", () => {
  it("matches the reference message costs in the spec", () => {
    expect(referenceCostMicros(PLANS.basic)).toBe(870);
    expect(referenceCostMicros(PLANS.plus)).toBe(1350);
    expect(referenceCostMicros(PLANS.pro)).toBe(2250);
  });

  it("accepts a plan id as well as a plan", () => {
    expect(referenceCostMicros("plus")).toBe(1350);
  });

  it("multiplies the reference cost by the daily message count", () => {
    expect(dailyBudgetMicros("basic")).toBe(40 * 870);
    expect(dailyBudgetMicros("plus")).toBe(100 * 1350);
    expect(dailyBudgetMicros("pro")).toBe(150 * 2250);
  });

  it("counts messages left from what is already spent", () => {
    expect(messagesLeft("basic", 0)).toBe(40);
    expect(messagesLeft("basic", 870)).toBe(39);
    expect(messagesLeft("basic", 34_799)).toBe(0);
    expect(messagesLeft("basic", 34_800)).toBe(0);
  });

  it("never goes below zero, even after an overshoot", () => {
    expect(messagesLeft("pro", 999_999)).toBe(0);
  });

  it("keeps the rupee reference rate", () => {
    expect(INR_PER_USD).toBe(95.44);
  });
});

describe("istDayStart", () => {
  it("returns the most recent midnight in Asia/Kolkata", () => {
    expect(
      istDayStart(new Date("2026-09-12T12:00:00.000Z")).toISOString()
    ).toBe("2026-09-11T18:30:00.000Z");
  });

  it("rolls over at 18:30 UTC, which is midnight IST", () => {
    expect(
      istDayStart(new Date("2026-09-12T18:29:59.999Z")).toISOString()
    ).toBe("2026-09-11T18:30:00.000Z");
    expect(
      istDayStart(new Date("2026-09-12T18:30:00.000Z")).toISOString()
    ).toBe("2026-09-12T18:30:00.000Z");
  });

  it("is idempotent on a day start", () => {
    const start = istDayStart(new Date("2026-09-12T03:00:00.000Z"));

    expect(istDayStart(start).toISOString()).toBe(start.toISOString());
  });
});
