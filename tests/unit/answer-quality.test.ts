import { describe, expect, it } from "vitest";
import { shouldAutoEnableWebSearch } from "@/lib/ai/freshness";
import { freshnessPrompt, regularPrompt, systemPrompt } from "@/lib/ai/prompts";

describe("answer quality guidance", () => {
  it("requires real visual formats instead of text art", () => {
    expect(regularPrompt).toContain("valid fenced `mermaid` diagram");
    expect(regularPrompt).toContain("Never substitute ASCII arrows");
    expect(regularPrompt).toContain("Markdown tables for real comparisons");
  });

  it("sets a warmer voice and respects short-answer requests", () => {
    expect(regularPrompt).toContain("warm, natural, confident and specific");
    expect(regularPrompt).toContain('"in short" means 2-4 useful sentences');
    expect(regularPrompt).toContain("simply say you are Able");
  });

  it("changes freshness instructions with search availability", () => {
    expect(freshnessPrompt(true)).toContain("verify it before answering");
    expect(freshnessPrompt(false)).toContain("Do not guess");
    expect(freshnessPrompt(false)).toContain("turn on Search");

    const prompt = systemPrompt({
      requestHints: {
        city: "Delhi",
        country: "IN",
        latitude: "28.6",
        longitude: "77.2",
      },
      webSearchEnabled: true,
    });
    expect(prompt).toContain("browser search tool or researched evidence");
  });
});

describe("automatic freshness routing", () => {
  it.each([
    "Tell me today's USA news",
    "What is the current price of Bitcoin?",
    "When will this phone launch in India?",
    "Tell me the good features of the S26 Ultra",
    "What are the latest Pixel 11 specs?",
    "Who is the current prime minister of Canada?",
  ])("searches for changeable information: %s", (question) => {
    expect(shouldAutoEnableWebSearch(question)).toBe(true);
  });

  it.each([
    "Explain what an algorithm is",
    "Show a flowchart for finding the greatest number",
    "What features make a good essay?",
    "Compare loops and recursion in a table",
    "What does current number mean in this algorithm?",
  ])("keeps stable lessons offline: %s", (question) => {
    expect(shouldAutoEnableWebSearch(question)).toBe(false);
  });
});
