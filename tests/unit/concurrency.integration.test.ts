import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { deleteUserAccount } from "@/lib/db/account-queries";
import {
  approvePayment,
  createPayment,
  getCurrentSubscription,
} from "@/lib/db/billing-queries";
import { db } from "@/lib/db/client";
import { countProjects, createProject } from "@/lib/db/project-queries";
import { payment, subscription, user } from "@/lib/db/schema";

const describeDb = process.env.TEST_POSTGRES_URL ? describe : describe.skip;
const day = 86_400_000;
describeDb("concurrent billing and project limits", () => {
  const users: string[] = [];
  const payments: string[] = [];
  async function student() {
    const [created] = await db
      .insert(user)
      .values({ email: `${randomUUID()}@able.test` })
      .returning();
    users.push(created.id);
    return created.id;
  }
  async function pay(
    userId: string,
    planId: "basic" | "plus" | "pro" = "basic"
  ) {
    const created = await createPayment({
      amountInr: 250,
      planId,
      userId,
      utr: randomUUID().replaceAll("-", "").slice(0, 24),
    });
    payments.push(created.id);
    return created.id;
  }
  afterAll(async () => {
    await Promise.all(users.map(deleteUserAccount));
    if (payments.length) {
      await db.delete(payment).where(inArray(payment.id, payments));
    }
    await db.$client.end();
  });
  it("accepts only one of simultaneous pending payments", async () => {
    const userId = await student();
    const results = await Promise.allSettled([
      pay(userId),
      pay(userId),
      pay(userId),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      await db
        .select()
        .from(payment)
        .where(and(eq(payment.userId, userId), eq(payment.status, "pending")))
    ).toHaveLength(1);
  });
  it("queues every early renewal and supersedes queued periods when switching plans", async () => {
    const userId = await student();
    const now = new Date();
    const first = await approvePayment({
      now,
      paymentId: await pay(userId),
      reviewer: "test",
    });
    const second = await approvePayment({
      now,
      paymentId: await pay(userId),
      reviewer: "test",
    });
    const third = await approvePayment({
      now,
      paymentId: await pay(userId),
      reviewer: "test",
    });
    expect(second.subscription.startsAt).toEqual(first.subscription.endsAt);
    expect(third.subscription.startsAt).toEqual(second.subscription.endsAt);
    expect(third.subscription.endsAt.getTime() - now.getTime()).toBe(90 * day);
    const switched = await approvePayment({
      now,
      paymentId: await pay(userId, "plus"),
      reviewer: "test",
    });
    expect(switched.subscription.startsAt).toEqual(now);
    expect((await getCurrentSubscription(userId, now))?.planId).toBe("plus");
    expect(
      await getCurrentSubscription(userId, new Date(now.getTime() + 40 * day))
    ).toBeNull();
  });
  it("approves one payment only once under simultaneous admin clicks", async () => {
    const userId = await student();
    const paymentId = await pay(userId);
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        approvePayment({ now: new Date(), paymentId, reviewer: "test" })
      )
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      await db
        .select()
        .from(subscription)
        .where(eq(subscription.paymentId, paymentId))
    ).toHaveLength(1);
  });
  it("enforces the Basic folder limit across parallel requests", async () => {
    const userId = await student();
    await approvePayment({
      now: new Date(),
      paymentId: await pay(userId),
      reviewer: "test",
    });
    const results = await Promise.allSettled(
      [1, 2, 3, 4, 5, 6].map((n) =>
        createProject({ name: `Folder ${n}`, userId })
      )
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    expect(await countProjects(userId)).toBe(3);
  });
  it("rejects project creation without a current subscription", async () => {
    const userId = await student();
    await expect(createProject({ name: "Blocked", userId })).rejects.toThrow();
    expect(await countProjects(userId)).toBe(0);
  });
});
