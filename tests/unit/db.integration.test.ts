import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteUserAccount, getUserById } from "@/lib/db/account-queries";
import {
  approvePayment,
  createPayment,
  createRefundRequest,
  getCurrentSubscription,
  listPayments,
  listRefundRequests,
  resolveRefundRequest,
} from "@/lib/db/billing-queries";
import { db } from "@/lib/db/client";
import { payment, user } from "@/lib/db/schema";
import { insertUsageEvent } from "@/lib/db/usage-queries";
import { getEntitlement } from "@/lib/entitlements";
import { referenceCostMicros } from "@/lib/metering";

/** Only runs against a real database, started with `corepack pnpm db:local`. */
const describeDb = process.env.POSTGRES_URL ? describe : describe.skip;

describeDb("the data layer against a real Postgres", () => {
  const stamp = Date.now();
  const email = `able-test-${stamp}@example.com`;
  const utr = `TEST${stamp}`;
  let userId = "";
  let paymentId = "";
  let requestId = "";

  beforeAll(async () => {
    const [created] = await db.insert(user).values({ email }).returning();

    userId = created.id;
  });

  afterAll(async () => {
    if (userId) {
      await deleteUserAccount(userId);
    }

    if (paymentId) {
      await db.delete(payment).where(eq(payment.id, paymentId));
    }

    await db.$client.end();
  });

  it("gives a new student no plan", async () => {
    const entitlement = await getEntitlement(userId);

    expect(entitlement.status).toBe("none");
    expect(entitlement.canSend).toBe(false);
    expect(entitlement.blockReason).toBe("no-plan");
  });

  it("records a payment and waits for approval", async () => {
    const created = await createPayment({
      amountInr: 800,
      planId: "plus",
      studentNote: "integration test",
      userId,
      utr,
    });

    paymentId = created.id;

    expect(created.status).toBe("pending");
    expect(created.utr).toBe(utr.toUpperCase());

    const entitlement = await getEntitlement(userId);

    expect(entitlement.status).toBe("pending");
    expect(entitlement.hasPendingPayment).toBe(true);
    expect(entitlement.canSend).toBe(false);
  });

  it("refuses a second pending payment and a reused reference", async () => {
    await expect(
      createPayment({
        amountInr: 800,
        planId: "plus",
        userId,
        utr: `OTHER${stamp}`,
      })
    ).rejects.toThrow();

    const queue = await listPayments({ status: "pending" });
    const mine = queue.find((row) => row.id === paymentId);

    expect(mine?.userEmail).toBe(email);
  });

  it("starts a 30 day plan on approval", async () => {
    const now = new Date();
    const { payment: approved, subscription } = await approvePayment({
      now,
      paymentId,
      reviewer: "admin@example.com",
    });

    expect(approved.status).toBe("approved");
    expect(approved.reviewedBy).toBe("admin@example.com");
    expect(subscription.status).toBe("active");
    expect(
      subscription.endsAt.getTime() - subscription.startsAt.getTime()
    ).toBe(30 * 24 * 60 * 60 * 1000);

    const entitlement = await getEntitlement(userId);

    expect(entitlement.status).toBe("active");
    expect(entitlement.canSend).toBe(true);
    expect(entitlement.planId).toBe("plus");
    expect(entitlement.messagesLeftToday).toBe(100);
    expect(entitlement.daysLeft).toBe(30);
  });

  it("drops messages left as usage is recorded", async () => {
    await insertUsageEvent({
      costMicros: 50 * referenceCostMicros("plus"),
      countsTowardLimit: true,
      createdAt: new Date(),
      inputTokens: 3000,
      kind: "chat",
      outputTokens: 1500,
      planId: "plus",
      userId,
    });

    const entitlement = await getEntitlement(userId);

    expect(entitlement.messagesLeftToday).toBe(50);
    expect(entitlement.canSend).toBe(true);
  });

  it("does not count a title towards the daily limit", async () => {
    await insertUsageEvent({
      costMicros: 50 * referenceCostMicros("plus"),
      countsTowardLimit: false,
      createdAt: new Date(),
      kind: "title",
      planId: "plus",
      userId,
    });

    const entitlement = await getEntitlement(userId);

    expect(entitlement.messagesLeftToday).toBe(50);
  });

  it("opens a refund request inside the window", async () => {
    const created = await createRefundRequest({
      now: new Date(),
      paymentId,
      reason: "integration test",
      userId,
    });

    requestId = created.id;

    expect(created.status).toBe("open");

    const open = await listRefundRequests({ status: "open" });
    const mine = open.find((row) => row.id === requestId);

    expect(mine?.userEmail).toBe(email);
    expect(mine?.amountInr).toBe(800);
    expect(mine?.planId).toBe("plus");
    expect(mine?.approvedAt).not.toBeNull();
  });

  it("ends access when the refund is paid back", async () => {
    const resolved = await resolveRefundRequest({
      requestId,
      resolution: "refunded",
      resolver: "admin@example.com",
    });

    expect(resolved.refundRequest.status).toBe("refunded");
    expect(resolved.payment?.status).toBe("refunded");
    expect(resolved.subscription?.status).toBe("refunded");

    expect(await getCurrentSubscription(userId)).toBeNull();

    const entitlement = await getEntitlement(userId);

    expect(entitlement.canSend).toBe(false);
    expect(entitlement.status).toBe("expired");
  });

  it("deletes the account but keeps the payment record", async () => {
    await deleteUserAccount(userId);

    expect(await getUserById(userId)).toBeNull();

    const [kept] = await db
      .select()
      .from(payment)
      .where(eq(payment.id, paymentId));

    expect(kept.userId).toBeNull();
    expect(kept.status).toBe("refunded");

    userId = "";
  });
});
