import { describe, expect, it } from "vitest";
import { greetingName, greetingText, timeOfDayGreeting } from "@/lib/greeting";

describe("home screen greeting", () => {
  it("follows the student's clock", () => {
    expect(timeOfDayGreeting(0)).toBe("Good evening");
    expect(timeOfDayGreeting(4)).toBe("Good evening");
    expect(timeOfDayGreeting(5)).toBe("Good morning");
    expect(timeOfDayGreeting(11)).toBe("Good morning");
    expect(timeOfDayGreeting(12)).toBe("Good afternoon");
    expect(timeOfDayGreeting(16)).toBe("Good afternoon");
    expect(timeOfDayGreeting(17)).toBe("Good evening");
    expect(timeOfDayGreeting(23)).toBe("Good evening");
  });

  it("prefers the nickname from Settings, then the account's first name", () => {
    expect(
      greetingName({ accountName: "Ayan Mansuri", nickname: "  Ayu " })
    ).toBe("Ayu");
    expect(greetingName({ accountName: "Ayan Mansuri", nickname: "" })).toBe(
      "Ayan"
    );
    expect(greetingName({ accountName: "  Ayan  ", nickname: "   " })).toBe(
      "Ayan"
    );
    expect(greetingName({ accountName: null, nickname: null })).toBe("");
    expect(greetingName({})).toBe("");
  });

  it("greets with or without a name", () => {
    expect(greetingText(9, "Ayan")).toBe("Good morning, Ayan");
    expect(greetingText(14, "Ayan")).toBe("Good afternoon, Ayan");
    expect(greetingText(20, "")).toBe("Good evening");
  });
});
