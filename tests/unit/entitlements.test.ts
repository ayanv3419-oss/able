import { describe, expect, it } from "vitest";
import {
  computeEntitlement,
  type EntitlementInput,
  type EntitlementSubscription,
} from "@/lib/entitlements";
import { dailyBudgetMicros, istDayStart } from "@/lib/metering";
import type { PlanId } from "@/lib/plans";

const now = new Date("2026-09-12T10:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function activeSub(
  planId: PlanId,
  endsInDays: number
): EntitlementSubscription {
  return {
    endsAt: new Date(now.getTime() + endsInDays * DAY_MS),
    planId,
    startsAt: new Date(now.getTime() - 5 * DAY_MS),
    status: "active",
  };
}

function input(overrides: Partial<EntitlementInput> = {}): EntitlementInput {
  return {
    hasPendingPayment: false,
    now,
    projectsUsed: 0,
    spentMicrosToday: 0,
    subscription: null,
    ...overrides,
  };
}

describe("computeEntitlement", () => {
  it("blocks a student with no plan", () => {
    const result = computeEntitlement(input());

    expect(result.status).toBe("none");
    expect(result.blockReason).toBe("no-plan");
    expect(result.canSend).toBe(false);
    expect(result.planId).toBeNull();
    expect(result.planName).toBeNull();
    expect(result.messagesLeftToday).toBeNull();
    expect(result.endsAt).toBeNull();
    expect(result.daysLeft).toBe(0);
    expect(result.projectLimit).toBe(0);
    expect(result.showRenewBanner).toBe(false);
  });

  it("shows a waiting state while a payment is unapproved", () => {
    const result = computeEntitlement(input({ hasPendingPayment: true }));

    expect(result.status).toBe("pending");
    expect(result.blockReason).toBe("pending");
    expect(result.canSend).toBe(false);
    expect(result.hasPendingPayment).toBe(true);
    expect(result.messagesLeftToday).toBeNull();
  });

  it("lets an active student send, with the plan's allowances", () => {
    const result = computeEntitlement(
      input({ projectsUsed: 2, subscription: activeSub("plus", 20) })
    );

    expect(result.status).toBe("active");
    expect(result.canSend).toBe(true);
    expect(result.blockReason).toBeNull();
    expect(result.planId).toBe("plus");
    expect(result.planName).toBe("Plus");
    expect(result.messagesLeftToday).toBe(100);
    expect(result.displayUnlimited).toBe(false);
    expect(result.reasoningEffort).toBe("medium");
    expect(result.projectLimit).toBe(20);
    expect(result.projectsUsed).toBe(2);
    expect(result.daysLeft).toBe(20);
    expect(result.showRenewBanner).toBe(false);
    expect(result.endsAt).toBe(
      new Date(now.getTime() + 20 * DAY_MS).toISOString()
    );
  });

  it("treats a finished period as expired", () => {
    const result = computeEntitlement(
      input({
        subscription: {
          endsAt: new Date(now.getTime() - DAY_MS),
          planId: "basic",
          startsAt: new Date(now.getTime() - 31 * DAY_MS),
          status: "active",
        },
      })
    );

    expect(result.status).toBe("expired");
    expect(result.blockReason).toBe("expired");
    expect(result.canSend).toBe(false);
    expect(result.messagesLeftToday).toBeNull();
    expect(result.planId).toBe("basic");
  });

  it("treats a refunded or revoked period as expired", () => {
    for (const status of ["refunded", "revoked", "superseded"] as const) {
      const result = computeEntitlement(
        input({ subscription: { ...activeSub("pro", 10), status } })
      );

      expect(result.status).toBe("expired");
      expect(result.canSend).toBe(false);
    }
  });

  it("blocks at the daily limit on a metered plan", () => {
    const result = computeEntitlement(
      input({
        spentMicrosToday: dailyBudgetMicros("basic"),
        subscription: activeSub("basic", 10),
      })
    );

    expect(result.messagesLeftToday).toBe(0);
    expect(result.canSend).toBe(false);
    expect(result.blockReason).toBe("daily-limit");
    expect(result.displayUnlimited).toBe(false);
  });

  it("blocks Pro at the hidden fair-use ceiling", () => {
    const result = computeEntitlement(
      input({
        spentMicrosToday: dailyBudgetMicros("pro"),
        subscription: activeSub("pro", 10),
      })
    );

    expect(result.messagesLeftToday).toBe(0);
    expect(result.canSend).toBe(false);
    expect(result.blockReason).toBe("fair-use-limit");
    expect(result.displayUnlimited).toBe(true);
  });

  it("shows the renew banner in the last three days only", () => {
    expect(
      computeEntitlement(input({ subscription: activeSub("plus", 2) }))
        .showRenewBanner
    ).toBe(true);
    expect(
      computeEntitlement(input({ subscription: activeSub("plus", 3) }))
        .showRenewBanner
    ).toBe(true);
    expect(
      computeEntitlement(input({ subscription: activeSub("plus", 4) }))
        .showRenewBanner
    ).toBe(false);
  });

  it("stays active when a renewal payment is pending", () => {
    const result = computeEntitlement(
      input({ hasPendingPayment: true, subscription: activeSub("plus", 2) })
    );

    expect(result.status).toBe("active");
    expect(result.hasPendingPayment).toBe(true);
    expect(result.canSend).toBe(true);
  });

  it("treats a plan that has not started yet as not current", () => {
    const result = computeEntitlement(
      input({
        subscription: {
          endsAt: new Date(now.getTime() + 40 * DAY_MS),
          planId: "plus",
          startsAt: new Date(now.getTime() + 10 * DAY_MS),
          status: "active",
        },
      })
    );

    expect(result.canSend).toBe(false);
    expect(result.status).toBe("expired");
  });

  it("counts the day from midnight Asia/Kolkata", () => {
    // 18:29:59Z is still the old IST day, so yesterday's spending blocks.
    const lastMomentOfIstDay = new Date("2026-09-12T18:29:59.000Z");
    const blocked = computeEntitlement({
      hasPendingPayment: false,
      now: lastMomentOfIstDay,
      projectsUsed: 0,
      spentMicrosToday: dailyBudgetMicros("basic"),
      subscription: activeSub("basic", 10),
    });

    expect(blocked.canSend).toBe(false);

    // One second later it is a new IST day, so nothing is spent yet.
    const newIstDay = new Date("2026-09-12T18:30:00.000Z");

    expect(istDayStart(newIstDay).toISOString()).toBe(newIstDay.toISOString());

    const fresh = computeEntitlement({
      hasPendingPayment: false,
      now: newIstDay,
      projectsUsed: 0,
      spentMicrosToday: 0,
      subscription: activeSub("basic", 10),
    });

    expect(fresh.canSend).toBe(true);
    expect(fresh.messagesLeftToday).toBe(40);
  });
});
