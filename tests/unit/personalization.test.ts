import { describe, expect, it } from "vitest";
import {
  profileSchema,
  responseLanguage,
  selectProjectHistory,
  selectRelevantMemories,
} from "@/lib/personalization";

describe("personalized context selection", () => {
  it("starts with an empty profile and validates explicit preferences", () => {
    expect(profileSchema.parse({}).displayName).toBe("");
    expect(profileSchema.parse({}).preferredLanguage).toBe("auto");
    expect(
      profileSchema.safeParse({ displayName: "a".repeat(81) }).success
    ).toBe(false);
    expect(
      profileSchema.parse({
        displayName: " Ayan ",
        preferredLanguage: "Gujarati",
      }).displayName
    ).toBe("Ayan");
  });

  it("matches Hindi, Gujarati and Hinglish without translating the user's input", () => {
    expect(responseLanguage("मुझे गुरुत्वाकर्षण समझाओ").language).toContain("Hindi");
    expect(responseLanguage("મને ગુરુત્વાકર્ષણ સમજાવો").language).toContain(
      "Gujarati"
    );
    expect(
      responseLanguage("Python decorators kaise kaam karte hain?").language
    ).toBe("Hinglish");
    expect(responseLanguage("What is gravity?").source).toBe("current input");
  });

  it("respects a saved language unless the current message explicitly requests another", () => {
    expect(responseLanguage("Explain gravity", "Hindi").language).toBe("Hindi");
    expect(
      responseLanguage("Explain gravity in English", "Hindi").language
    ).toBe("English");
    expect(responseLanguage("Hindi mein samjhao", "English").language).toBe(
      "Hindi"
    );
  });

  it("selects relevant memories without leaking other projects or unrelated facts", () => {
    const memories = [
      { content: "Python decorators wrap functions", projectId: "python" },
      { content: "Private business sales target", projectId: "business" },
      { content: "I prefer practical examples", projectId: null },
      { content: "My dog's name is Bruno", projectId: null },
    ];
    expect(
      selectRelevantMemories(
        memories,
        "Explain Python decorators",
        "python"
      ).map((item) => item.content)
    ).toEqual([
      "Python decorators wrap functions",
      "I prefer practical examples",
    ]);
    expect(
      selectRelevantMemories(memories, "Explain Python decorators", null).map(
        (item) => item.content
      )
    ).toEqual(["I prefer practical examples"]);
    expect(selectRelevantMemories([], "Continue yesterday", "python")).toEqual(
      []
    );
  });

  it("finds yesterday's project discussion and keeps a bounded chronological history", () => {
    const now = new Date("2026-09-12T10:00:00Z");
    const prior = {
      chatId: "prior",
      createdAt: new Date("2026-09-11T10:00:00Z"),
      role: "user",
      text: "We studied closures",
      title: "Python closures",
    };
    const today = {
      chatId: "today",
      createdAt: now,
      role: "assistant",
      text: "Install Python",
      title: "Setup",
    };
    const history = selectProjectHistory(
      [today, prior],
      "Continue what we were doing yesterday",
      now
    );
    expect(history[0]).toEqual(prior);
    expect(selectProjectHistory([today, prior], "Photosynthesis", now)).toEqual(
      []
    );
    const large = Array.from({ length: 30 }, (_, index) => ({
      ...prior,
      chatId: String(index),
      text: "Python ".repeat(3000),
    }));
    expect(
      selectProjectHistory(large, "Python", now).reduce(
        (total, item) => total + item.text.length,
        0
      )
    ).toBeLessThanOrEqual(12_000);
  });

  it("uses no more memories or excerpts than the plan allows", () => {
    const memories = Array.from({ length: 12 }, (_, index) => ({
      content: `Python fact ${index}`,
      projectId: null,
    }));
    const query = "Explain Python";
    expect(selectRelevantMemories(memories, query, null, 3)).toHaveLength(3);
    expect(selectRelevantMemories(memories, query, null, 6)).toHaveLength(6);
    expect(selectRelevantMemories(memories, query, null)).toHaveLength(10);

    const now = new Date("2026-09-12T10:00:00Z");
    const excerpts = Array.from({ length: 12 }, (_, index) => ({
      chatId: String(index),
      createdAt: new Date(now.getTime() - index * 60_000),
      role: "user",
      text: `Python note ${index}`,
      title: "Python",
    }));
    expect(selectProjectHistory(excerpts, query, now, 3)).toHaveLength(3);
    expect(selectProjectHistory(excerpts, query, now)).toHaveLength(10);
  });
});
