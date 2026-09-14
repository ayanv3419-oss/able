import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { PAYMENT_REJECTION_MESSAGE } from "@/lib/billing/rules";
import { deleteUserAccount, getUserById } from "@/lib/db/account-queries";
import {
  approvePayment,
  countPendingPayments,
  createPayment,
  listBlockedStudents,
  listPaymentsByUserId,
  listPendingPaymentsWithApproval,
  rejectPayment,
  unblockStudent,
} from "@/lib/db/billing-queries";
import { db } from "@/lib/db/client";
import { payment, subscription, user } from "@/lib/db/schema";
import { getEntitlement } from "@/lib/entitlements";
import { getPlan, type PlanId } from "@/lib/plans";

const describeDb = process.env.TEST_POSTGRES_URL ? describe : describe.skip;
const day = 86_400_000;

describeDb("request, allow, reject and unblock", () => {
  const users: string[] = [];
  const payments: string[] = [];
  async function student() {
    const [row] = await db
      .insert(user)
      .values({ email: `${randomUUID()}@able.test` })
      .returning();
    users.push(row.id);
    return row.id;
  }
  async function request(userId: string, planId: PlanId = "basic") {
    const row = await createPayment({
      amountInr: getPlan(planId).priceInr,
      planId,
      userId,
    });
    payments.push(row.id);
    return row;
  }
  async function reject(paymentId: string) {
    return await rejectPayment({
      paymentId,
      reviewer: "admin@able.test",
      reviewNote: PAYMENT_REJECTION_MESSAGE,
    });
  }
  async function allow(paymentId: string, now = new Date()) {
    return await approvePayment({ now, paymentId, reviewer: "test" });
  }
  afterAll(async () => {
    await Promise.all(users.map(deleteUserAccount));
    if (payments.length) {
      await db.delete(payment).where(inArray(payment.id, payments));
    }
    await db.$client.end();
  });

  it("records a request with no reference number, one at a time", async () => {
    const userId = await student();
    const before = await countPendingPayments();
    const sent = await request(userId, "plus");
    expect(sent.utr).toBeNull();
    expect(sent.status).toBe("pending");
    expect(await countPendingPayments()).toBe(before + 1);
    await expect(request(userId, "basic")).rejects.toThrow();
  });

  it("blocks on reject, keeps the history and lets the student back after unblock", async () => {
    const userId = await student();
    const sent = await request(userId, "plus");
    await reject(sent.id);
    expect((await getUserById(userId))?.blockedAt).toBeInstanceOf(Date);
    const blocked = await getEntitlement(userId);
    expect(blocked.status).toBe("blocked");
    expect(blocked.canSend).toBe(false);
    expect((await listBlockedStudents()).map((row) => row.id)).toContain(
      userId
    );
    await expect(request(userId, "basic")).rejects.toThrow("blocked");

    await unblockStudent(userId);
    expect((await getUserById(userId))?.blockedAt).toBeNull();
    expect((await getEntitlement(userId)).status).toBe("none");
    const retry = await request(userId, "basic");
    const allowed = await allow(retry.id);
    expect(allowed.subscription.planId).toBe("basic");
    expect(
      allowed.subscription.endsAt.getTime() -
        allowed.subscription.startsAt.getTime()
    ).toBe(30 * day);
    const history = await listPaymentsByUserId(userId);
    expect(history.find((row) => row.id === sent.id)).toMatchObject({
      reviewNote: PAYMENT_REJECTION_MESSAGE,
      status: "rejected",
    });
    expect(history.find((row) => row.id === retry.id)?.status).toBe("approved");
  });

  it("blocks even a student who has an active plan", async () => {
    const userId = await student();
    await allow((await request(userId, "basic")).id);
    expect((await getEntitlement(userId)).canSend).toBe(true);
    await reject((await request(userId, "plus")).id);
    const entitlement = await getEntitlement(userId);
    expect(entitlement.status).toBe("blocked");
    expect(entitlement.canSend).toBe(false);
  });

  it("matches approval previews to new plans, queued renewals and switches", async () => {
    const userId = await student();
    const now = new Date();
    for (const [index, planId] of (
      ["basic", "basic", "basic", "plus"] as const
    ).entries()) {
      // biome-ignore lint/performance/noAwaitInLoops: Each renewal depends on the previous approval.
      const pending = await request(userId, planId);
      const preview = (await listPendingPaymentsWithApproval(now, 200)).find(
        (row) => row.id === pending.id
      );
      const approved = await allow(pending.id, now);
      expect(preview?.approval.startsAt).toEqual(
        approved.subscription.startsAt
      );
      expect(preview?.approval.endsAt).toEqual(approved.subscription.endsAt);
      if (index === 2) {
        expect(preview?.approval.endsAt.getTime()).toBe(
          now.getTime() + 90 * day
        );
      }
      if (index === 3) {
        expect(preview?.approval.current?.endsAt.getTime()).toBe(
          now.getTime() + 90 * day
        );
        expect(preview?.approval.supersedeId).toBeTruthy();
      }
    }
  });

  it("resolves a simultaneous allow and reject only once", async () => {
    const userId = await student();
    const pending = await request(userId);
    const results = await Promise.allSettled([
      allow(pending.id),
      reject(pending.id),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1);
    const [resolved] = await db
      .select()
      .from(payment)
      .where(eq(payment.id, pending.id));
    const subscriptions = await db
      .select()
      .from(subscription)
      .where(eq(subscription.paymentId, pending.id));
    expect(subscriptions).toHaveLength(resolved.status === "approved" ? 1 : 0);
    expect(Boolean((await getUserById(userId))?.blockedAt)).toBe(
      resolved.status === "rejected"
    );
  });
});
