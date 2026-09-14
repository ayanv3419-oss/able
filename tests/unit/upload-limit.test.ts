import { describe, expect, it } from "vitest";
import { uploadLimitError } from "@/lib/billing/upload-limit";
import { PLANS } from "@/lib/plans";

describe("daily upload caps", () => {
  it("lets Basic upload 5 files a day", () => {
    expect(uploadLimitError(PLANS.basic, 0)).toBeNull();
    expect(uploadLimitError(PLANS.basic, 4)).toBeNull();
    expect(uploadLimitError(PLANS.basic, 5)).toBe(
      "You've used today's 5 uploads. They reset at midnight India time."
    );
  });

  it("lets Plus upload 20 files a day", () => {
    expect(uploadLimitError(PLANS.plus, 19)).toBeNull();
    expect(uploadLimitError(PLANS.plus, 20)).toContain("today's 20 uploads");
  });

  it("never stops Pro", () => {
    expect(uploadLimitError(PLANS.pro, 10_000)).toBeNull();
  });
});
