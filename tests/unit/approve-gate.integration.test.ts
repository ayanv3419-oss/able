import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { PAYMENT_REJECTION_MESSAGE } from "@/lib/billing/rules";
import { deleteUserAccount } from "@/lib/db/account-queries";
import {
  approvePayment,
  countPendingPayments,
  createPayment,
  listPaymentsByUserId,
  listPendingPaymentsWithApproval,
  rejectPayment,
} from "@/lib/db/billing-queries";
import { db } from "@/lib/db/client";
import { payment, subscription, user } from "@/lib/db/schema";
import { getPlan, type PlanId } from "@/lib/plans";

const describeDb = process.env.TEST_POSTGRES_URL ? describe : describe.skip;
const day = 86_400_000;

describeDb("approve gate", () => {
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
  async function pay(
    userId: string,
    planId: PlanId = "basic",
    utr = randomUUID().replaceAll("-", "").slice(0, 24)
  ) {
    const row = await createPayment({
      amountInr: getPlan(planId).priceInr,
      planId,
      userId,
      utr,
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
  afterAll(async () => {
    await Promise.all(users.map(deleteUserAccount));
    if (payments.length) {
      await db.delete(payment).where(inArray(payment.id, payments));
    }
    await db.$client.end();
  });

  it("reuses rejected UTRs for the corrected plan and keeps the review history", async () => {
    const userId = await student();
    const before = await countPendingPayments();
    const original = await pay(userId, "plus");
    expect(await countPendingPayments()).toBe(before + 1);
    await reject(original.id);
    expect(await countPendingPayments()).toBe(before);
    const retry = await pay(userId, "basic", original.utr.toLowerCase());
    await expect(
      approvePayment({
        now: new Date(),
        paymentId: original.id,
        reviewer: "test",
      })
    ).rejects.toThrow();
    const approved = await approvePayment({
      now: new Date(),
      paymentId: retry.id,
      reviewer: "test",
    });
    expect(approved.subscription.planId).toBe("basic");
    expect(
      approved.subscription.endsAt.getTime() -
        approved.subscription.startsAt.getTime()
    ).toBe(30 * day);
    const history = await listPaymentsByUserId(userId);
    expect(history).toHaveLength(2);
    expect(history.find((row) => row.id === original.id)).toMatchObject({
      reviewNote: PAYMENT_REJECTION_MESSAGE,
      status: "rejected",
    });
    expect(history.find((row) => row.id === retry.id)?.status).toBe("approved");
  });

  it.each([
    "pending",
    "approved",
    "refunded",
  ] as const)("blocks a %s UTR even after an earlier rejection, across accounts", async (status) => {
    const userId = await student();
    const old = await pay(userId);
    await reject(old.id);
    const active = await pay(userId, "basic", old.utr);
    await db.update(payment).set({ status }).where(eq(payment.id, active.id));
    await expect(
      pay(await student(), "pro", old.utr.toLowerCase())
    ).rejects.toThrow();
  });

  it("allows repeated rejections but only one simultaneous reuse across accounts", async () => {
    const userId = await student();
    const old = await pay(userId);
    await reject(old.id);
    const retry = await pay(userId, "plus", old.utr);
    await reject(retry.id);
    const [first, second] = await Promise.all([student(), student()]);
    const results = await Promise.allSettled([
      pay(first, "basic", old.utr),
      pay(second, "plus", old.utr),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1);
  });

  it("matches approval previews to new plans, queued renewals and switches", async () => {
    const userId = await student();
    const now = new Date();
    for (const [index, planId] of (
      ["basic", "basic", "basic", "plus"] as const
    ).entries()) {
      // biome-ignore lint/performance/noAwaitInLoops: Each renewal depends on the previous approval.
      const pending = await pay(userId, planId);
      const preview = (await listPendingPaymentsWithApproval(now, 200)).find(
        (row) => row.id === pending.id
      );
      const approved = await approvePayment({
        now,
        paymentId: pending.id,
        reviewer: "test",
      });
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

  it("resolves a simultaneous approve and reject only once", async () => {
    const userId = await student();
    const pending = await pay(userId);
    const results = await Promise.allSettled([
      approvePayment({
        now: new Date(),
        paymentId: pending.id,
        reviewer: "test",
      }),
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
  });
});
