import { describe, expect, it } from "vitest";
import { LOW_MESSAGES, planNotice } from "@/lib/billing/plan-notice";
import type { EntitlementSummary } from "@/lib/entitlements";

const normalDay: EntitlementSummary = {
  blockReason: null,
  canSend: true,
  daysLeft: 20,
  displayUnlimited: false,
  endsAt: "2026-10-03T00:00:00.000Z",
  hasPendingPayment: false,
  messagesLeftToday: 80,
  planId: "plus",
  planName: "Plus",
  projectLimit: 10,
  projectsUsed: 0,
  reasoningEffort: "medium",
  showRenewBanner: false,
  status: "active",
};

describe("plan notice above the message box", () => {
  it("stays hidden on a normal day", () => {
    expect(planNotice(normalDay)).toBeNull();
    expect(
      planNotice({ ...normalDay, messagesLeftToday: LOW_MESSAGES })
    ).toBeNull();
  });

  it("counts the last few messages of the day", () => {
    expect(
      planNotice({ ...normalDay, messagesLeftToday: LOW_MESSAGES - 1 })
    ).toEqual({ renew: false, text: "9 messages left today." });
    expect(planNotice({ ...normalDay, messagesLeftToday: 1 })).toEqual({
      renew: false,
      text: "1 message left today.",
    });
  });

  it("never counts messages on an unlimited plan", () => {
    expect(
      planNotice({ ...normalDay, displayUnlimited: true, messagesLeftToday: 2 })
    ).toBeNull();
  });

  it("offers Renew when the plan ends soon", () => {
    const endsSoon = { ...normalDay, showRenewBanner: true };
    expect(planNotice({ ...endsSoon, daysLeft: 2 })).toEqual({
      renew: true,
      text: "Your plan ends in 2 days.",
    });
    expect(planNotice({ ...endsSoon, daysLeft: 1 })?.text).toBe(
      "Your plan ends in 1 day."
    );
    expect(planNotice({ ...endsSoon, daysLeft: 0 })?.text).toBe(
      "Your plan ends today."
    );
    expect(
      planNotice({ ...endsSoon, daysLeft: 1, messagesLeftToday: 3 })
    ).toEqual({
      renew: true,
      text: "3 messages left today. Your plan ends in 1 day.",
    });
  });

  it("leaves blocked and expired plans to the paywall card", () => {
    expect(
      planNotice({ ...normalDay, canSend: false, messagesLeftToday: 0 })
    ).toBeNull();
    expect(
      planNotice({ ...normalDay, showRenewBanner: true, status: "expired" })
    ).toBeNull();
  });
});
