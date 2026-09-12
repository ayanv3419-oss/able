import { describe, expect, it } from "vitest";
import { GroqSearchTracker } from "@/lib/ai/groq-search";
import { usageForBilling } from "@/lib/ai/usage";

function chunk(name: string, index: number, urls: string[] = []) {
  return {
    choices: [
      {
        delta: {
          executed_tools: [
            {
              index,
              name,
              search_results: {
                results: urls.map((url) => ({ title: "Source", url })),
              },
            },
          ],
        },
      },
    ],
  };
}

describe("Groq browser search stream", () => {
  it("counts start and completion once, and does not count page opens as searches", () => {
    const tracker = new GroqSearchTracker();
    tracker.startStep();
    tracker.read(chunk("browser.search", 0));
    tracker.read(chunk("browser.search", 0, ["https://example.com"]));
    tracker.read(chunk("browser.open", 1));
    tracker.read(chunk("browser.search", 2));
    expect(tracker.searchCount).toBe(2);
    tracker.startStep();
    tracker.read(chunk("browser.search", 0));
    expect(tracker.searchCount).toBe(3);
  });

  it("deduplicates sources and rejects unsafe links", () => {
    const tracker = new GroqSearchTracker();
    const raw = chunk("browser.search", 0, [
      "https://example.com",
      "javascript:alert(1)",
      "https://example.com",
    ]);
    expect(tracker.read(raw)).toEqual([
      {
        sourceId: "https://example.com",
        title: "Source",
        url: "https://example.com",
      },
    ]);
    expect(tracker.read(raw)).toEqual([]);
  });

  it("ignores unrelated, missing and malformed provider fields", () => {
    const tracker = new GroqSearchTracker();
    for (const raw of [
      null,
      {},
      { choices: [] },
      { choices: [{ delta: { content: "hello" } }] },
      chunk("browser.search", -1),
    ]) {
      expect(tracker.read(raw)).toEqual([]);
    }
    expect(tracker.searchCount).toBe(0);
  });
});

it("does not charge cached input tokens twice", () => {
  expect(
    usageForBilling({
      inputTokenDetails: {
        cacheReadTokens: 400,
        cacheWriteTokens: undefined,
        noCacheTokens: undefined,
      },
      inputTokens: 1000,
      outputTokenDetails: { reasoningTokens: 100, textTokens: 150 },
      outputTokens: 250,
      totalTokens: 1250,
    })
  ).toEqual({
    cachedInputTokens: 400,
    inputTokens: 600,
    outputTokens: 250,
    reasoningTokens: 100,
  });
});
