import { describe, expect, it } from "vitest";
import {
  buildUpiUri,
  computeApproval,
  daysLeft,
  isRefundEligible,
  normalizeUtr,
  REFUND_WINDOW_DAYS,
} from "@/lib/billing/rules";

const DAY_MS = 24 * 60 * 60 * 1000;

function days(count: number): number {
  return count * DAY_MS;
}

describe("normalizeUtr", () => {
  it("drops spaces and dashes and upper-cases the rest", () => {
    expect(normalizeUtr("  1234 5678-90 ")).toEqual({
      ok: true,
      utr: "1234567890",
    });
    expect(normalizeUtr("abcdef1234")).toEqual({
      ok: true,
      utr: "ABCDEF1234",
    });
  });

  it("accepts 10 to 24 characters", () => {
    expect(normalizeUtr("a".repeat(10)).ok).toBe(true);
    expect(normalizeUtr("a".repeat(24)).ok).toBe(true);
  });

  it("rejects anything shorter or longer", () => {
    expect(normalizeUtr("a".repeat(9)).ok).toBe(false);
    expect(normalizeUtr("a".repeat(25)).ok).toBe(false);
  });

  it("rejects an empty reference", () => {
    const result = normalizeUtr("   ");

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error.length > 0).toBe(true);
  });

  it("rejects anything that is not a letter or a digit", () => {
    expect(normalizeUtr("12345678!0").ok).toBe(false);
    expect(normalizeUtr("abc_def_123").ok).toBe(false);
  });
});

describe("computeApproval", () => {
  const now = new Date("2026-09-12T10:00:00.000Z");

  it("starts a first plan at the approval time", () => {
    const approval = computeApproval({ current: null, now, planId: "plus" });

    expect(approval.startsAt.toISOString()).toBe(now.toISOString());
    expect(approval.endsAt.getTime()).toBe(now.getTime() + days(30));
    expect(approval.supersedeId).toBeNull();
  });

  it("extends the same plan from the old end date", () => {
    const endsAt = new Date("2026-10-01T00:00:00.000Z");
    const approval = computeApproval({
      current: { endsAt, id: "sub-1", planId: "plus" },
      now,
      planId: "plus",
    });

    expect(approval.startsAt.toISOString()).toBe(endsAt.toISOString());
    expect(approval.endsAt.getTime()).toBe(endsAt.getTime() + days(30));
    expect(approval.supersedeId).toBeNull();
  });

  it("starts a different plan now and supersedes the old one", () => {
    const approval = computeApproval({
      current: {
        endsAt: new Date("2026-10-01T00:00:00.000Z"),
        id: "sub-1",
        planId: "plus",
      },
      now,
      planId: "pro",
    });

    expect(approval.startsAt.toISOString()).toBe(now.toISOString());
    expect(approval.endsAt.getTime()).toBe(now.getTime() + days(30));
    expect(approval.supersedeId).toBe("sub-1");
  });
});

describe("isRefundEligible", () => {
  const approvedAt = new Date("2026-09-01T00:00:00.000Z");

  it("keeps the window at 7 days", () => {
    expect(REFUND_WINDOW_DAYS).toBe(7);
  });

  it("allows a refund inside the window", () => {
    expect(
      isRefundEligible({
        approvedAt,
        hasOpenRequest: false,
        now: new Date(approvedAt.getTime() + days(3)),
        paymentStatus: "approved",
      })
    ).toBe(true);
  });

  it("allows a refund on the last moment of the window", () => {
    expect(
      isRefundEligible({
        approvedAt,
        hasOpenRequest: false,
        now: new Date(approvedAt.getTime() + days(7)),
        paymentStatus: "approved",
      })
    ).toBe(true);
  });

  it("refuses a refund outside the window", () => {
    expect(
      isRefundEligible({
        approvedAt,
        hasOpenRequest: false,
        now: new Date(approvedAt.getTime() + days(7) + 1),
        paymentStatus: "approved",
      })
    ).toBe(false);
  });

  it("refuses a second request while one is open", () => {
    expect(
      isRefundEligible({
        approvedAt,
        hasOpenRequest: true,
        now: new Date(approvedAt.getTime() + days(1)),
        paymentStatus: "approved",
      })
    ).toBe(false);
  });

  it("refuses anything but an approved payment", () => {
    const now = new Date(approvedAt.getTime() + days(1));

    expect(
      isRefundEligible({
        approvedAt,
        hasOpenRequest: false,
        now,
        paymentStatus: "pending",
      })
    ).toBe(false);
    expect(
      isRefundEligible({
        approvedAt,
        hasOpenRequest: false,
        now,
        paymentStatus: "refunded",
      })
    ).toBe(false);
    expect(
      isRefundEligible({
        approvedAt: null,
        hasOpenRequest: false,
        now,
        paymentStatus: "approved",
      })
    ).toBe(false);
  });
});

describe("daysLeft", () => {
  const now = new Date("2026-09-12T10:00:00.000Z");

  it("counts a part day as a whole day", () => {
    expect(daysLeft(new Date(now.getTime() + days(2.5)), now)).toBe(3);
    expect(daysLeft(new Date(now.getTime() + 60 * 60 * 1000), now)).toBe(1);
  });

  it("counts whole days exactly", () => {
    expect(daysLeft(new Date(now.getTime() + days(30)), now)).toBe(30);
  });

  it("is zero once the end has passed", () => {
    expect(daysLeft(now, now)).toBe(0);
    expect(daysLeft(new Date(now.getTime() - 1), now)).toBe(0);
  });
});

describe("buildUpiUri", () => {
  it("builds an encoded upi pay link", () => {
    expect(
      buildUpiUri({
        amountInr: 250,
        note: "Able plus 1a2b3c",
        payeeName: "Able",
        upiId: "able@upi",
      })
    ).toBe(
      "upi://pay?pa=able%40upi&pn=Able&am=250&cu=INR&tn=Able%20plus%201a2b3c"
    );
  });

  it("encodes a payee name with spaces and symbols", () => {
    expect(
      buildUpiUri({
        amountInr: 1200,
        note: "Able pro 9z8y",
        payeeName: "Able Learning & Co",
        upiId: "able.pay@okaxis",
      })
    ).toBe(
      "upi://pay?pa=able.pay%40okaxis&pn=Able%20Learning%20%26%20Co&am=1200&cu=INR&tn=Able%20pro%209z8y"
    );
  });
});
