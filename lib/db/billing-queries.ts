import "server-only";

import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  type SQL,
} from "drizzle-orm";
import {
  type CurrentSubscription,
  computeApprovalForPeriods,
  isRefundEligible,
  RENEW_BANNER_DAYS,
} from "../billing/rules";
import { ChatbotError } from "../errors";
import type { PlanId } from "../plans";
import { db } from "./client";
import {
  type Payment,
  payment,
  type RefundRequest,
  refundRequest,
  type Subscription,
  subscription,
  user,
} from "./schema";

const DAY_MS = 24 * 60 * 60 * 1000;
const UNIQUE_VIOLATION = "23505";
const DEFAULT_PAGE_SIZE = 50;

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if ("code" in error && error.code === UNIQUE_VIOLATION) {
    return true;
  }
  return "cause" in error && isUniqueViolation(error.cause);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export type PaymentWithEmail = Payment & { userEmail: string | null };

export type SubscriptionWithEmail = Subscription & { userEmail: string | null };

export type RefundRequestDetails = RefundRequest & {
  userEmail: string | null;
  amountInr: number;
  planId: PlanId;
  /** When the payment was approved, which starts the refund window. */
  approvedAt: Date | null;
};

export type ReminderDue = {
  subscriptionId: string;
  userId: string;
  userEmail: string | null;
  planId: PlanId;
  endsAt: Date;
};

/**
 * Records a student's request after they pay by UPI. A student may have only
 * one pending request, and a blocked student cannot send one.
 */
export async function createPayment({
  amountInr,
  planId,
  userId,
}: {
  userId: string;
  planId: PlanId;
  amountInr: number;
}): Promise<Payment> {
  try {
    return await db.transaction(async (tx) => {
      const [student] = await tx
        .select({ blockedAt: user.blockedAt, id: user.id })
        .from(user)
        .where(eq(user.id, userId))
        .for("update");
      if (!student) {
        throw new ChatbotError("unauthorized:auth");
      }
      if (student.blockedAt) {
        throw new ChatbotError("forbidden:account");
      }
      const [pending] = await tx
        .select({ id: payment.id })
        .from(payment)
        .where(and(eq(payment.userId, userId), eq(payment.status, "pending")))
        .limit(1);
      if (pending) {
        throw new ChatbotError("forbidden:payment");
      }
      const [created] = await tx
        .insert(payment)
        .values({ amountInr, planId, status: "pending", userId })
        .returning();

      return created;
    });
  } catch (error) {
    if (error instanceof ChatbotError) {
      throw error;
    }
    if (isUniqueViolation(error)) {
      // Two simultaneous requests race for the one-pending-request index.
      throw new ChatbotError("forbidden:payment", { cause: error });
    }

    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function getPendingPaymentByUserId(
  userId: string
): Promise<Payment | null> {
  const [row] = await db
    .select()
    .from(payment)
    .where(and(eq(payment.userId, userId), eq(payment.status, "pending")))
    .orderBy(desc(payment.createdAt))
    .limit(1);

  return row ?? null;
}

export async function listPaymentsByUserId(userId: string): Promise<Payment[]> {
  return await db
    .select()
    .from(payment)
    .where(eq(payment.userId, userId))
    .orderBy(desc(payment.createdAt));
}

/** The admin payments queue, newest first. */
export async function listPayments({
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  status,
}: {
  status?: Payment["status"];
  limit?: number;
  offset?: number;
} = {}): Promise<PaymentWithEmail[]> {
  const rows = await db
    .select({ row: payment, userEmail: user.email })
    .from(payment)
    .leftJoin(user, eq(payment.userId, user.id))
    .where(status ? eq(payment.status, status) : undefined)
    .orderBy(desc(payment.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map(({ row, userEmail }) => ({ ...row, userEmail }));
}

export async function countPendingPayments(): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(payment)
    .where(eq(payment.status, "pending"));
  return row.count;
}

/** Batch-load subscription context instead of one query for every queue row. */
export async function listPendingPaymentsWithApproval(
  now: Date,
  limit: number
) {
  const pending = await listPayments({ limit, status: "pending" });
  const userIds = pending.flatMap((row) => (row.userId ? [row.userId] : []));
  const periods = userIds.length
    ? await db
        .select()
        .from(subscription)
        .where(
          and(
            inArray(subscription.userId, userIds),
            eq(subscription.status, "active"),
            gt(subscription.endsAt, now)
          )
        )
    : [];
  const byUser = new Map<string, CurrentSubscription[]>();
  for (const period of periods) {
    const existing = byUser.get(period.userId) ?? [];
    existing.push(period);
    byUser.set(period.userId, existing);
  }
  return pending.map((row) => ({
    ...row,
    approval: computeApprovalForPeriods({
      now,
      periods: byUser.get(row.userId ?? "") ?? [],
      planId: row.planId,
    }),
  }));
}

export type PendingPaymentWithApproval = Awaited<
  ReturnType<typeof listPendingPaymentsWithApproval>
>[number];

/**
 * Approves a pending payment and starts its period, per docs/SPEC.md §7.
 * Renewing the same plan extends it; a different plan supersedes the old one.
 */
export async function approvePayment({
  now,
  paymentId,
  reviewer,
}: {
  paymentId: string;
  reviewer: string;
  now: Date;
}): Promise<{ payment: Payment; subscription: Subscription }> {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(payment)
      .where(eq(payment.id, paymentId))
      .for("update");

    if (!existing) {
      throw new ChatbotError("not_found:payment");
    }

    if (existing.status !== "pending") {
      throw new ChatbotError(
        "bad_request:api",
        "Only a pending payment can be approved."
      );
    }

    if (!existing.userId) {
      throw new ChatbotError(
        "bad_request:api",
        "This payment is no longer linked to a student."
      );
    }

    // Serialize approvals for this student, including different payments.
    await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, existing.userId))
      .for("update");

    const unexpired = await tx
      .select()
      .from(subscription)
      .where(
        and(
          eq(subscription.userId, existing.userId),
          eq(subscription.status, "active"),
          gt(subscription.endsAt, now)
        )
      )
      .orderBy(desc(subscription.endsAt));

    const approval = computeApprovalForPeriods({
      now,
      periods: unexpired,
      planId: existing.planId,
    });

    if (approval.supersedeId) {
      await tx
        .update(subscription)
        .set({ status: "superseded" })
        .where(
          and(
            eq(subscription.userId, existing.userId),
            eq(subscription.status, "active"),
            gt(subscription.endsAt, now)
          )
        );
    }

    const [created] = await tx
      .insert(subscription)
      .values({
        endsAt: approval.endsAt,
        paymentId: existing.id,
        planId: existing.planId,
        startsAt: approval.startsAt,
        status: "active",
        userId: existing.userId,
      })
      .returning();

    const [updated] = await tx
      .update(payment)
      .set({ reviewedAt: now, reviewedBy: reviewer, status: "approved" })
      .where(eq(payment.id, paymentId))
      .returning();

    return { payment: updated, subscription: created };
  });
}

/**
 * Rejects a pending request and blocks the student, per the owner's board:
 * a rejection stops the whole cycle until the owner unblocks them.
 */
export async function rejectPayment({
  paymentId,
  reviewNote,
  reviewer,
}: {
  paymentId: string;
  reviewer: string;
  reviewNote: string;
}): Promise<Payment> {
  return await db.transaction(async (tx) => {
    const now = new Date();
    const [updated] = await tx
      .update(payment)
      .set({
        reviewedAt: now,
        reviewedBy: reviewer,
        reviewNote,
        status: "rejected",
      })
      .where(and(eq(payment.id, paymentId), eq(payment.status, "pending")))
      .returning();

    if (!updated) {
      throw new ChatbotError("not_found:payment");
    }

    if (updated.userId) {
      await tx
        .update(user)
        .set({ blockedAt: now })
        .where(eq(user.id, updated.userId));
    }

    return updated;
  });
}

/** Lets a blocked student use Able and send requests again. */
export async function unblockStudent(userId: string): Promise<void> {
  const [updated] = await db
    .update(user)
    .set({ blockedAt: null })
    .where(eq(user.id, userId))
    .returning({ id: user.id });

  if (!updated) {
    throw new ChatbotError("not_found:account");
  }
}

export type BlockedStudent = { id: string; email: string; blockedAt: Date };

/** Blocked students, most recently blocked first. */
export async function listBlockedStudents(): Promise<BlockedStudent[]> {
  const rows = await db
    .select({ blockedAt: user.blockedAt, email: user.email, id: user.id })
    .from(user)
    .where(isNotNull(user.blockedAt))
    .orderBy(desc(user.blockedAt));

  return rows.flatMap(({ blockedAt, email, id }) =>
    blockedAt ? [{ blockedAt, email, id }] : []
  );
}

/** The subscription that is running right now, if any. */
export async function getCurrentSubscription(
  userId: string,
  now = new Date()
): Promise<Subscription | null> {
  const [row] = await db
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.userId, userId),
        eq(subscription.status, "active"),
        lte(subscription.startsAt, now),
        gt(subscription.endsAt, now)
      )
    )
    .orderBy(desc(subscription.endsAt))
    .limit(1);

  return row ?? null;
}

/** The most recently created subscription, whatever its status. */
export async function getLatestSubscription(
  userId: string
): Promise<Subscription | null> {
  const [row] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .orderBy(desc(subscription.createdAt), desc(subscription.endsAt))
    .limit(1);

  return row ?? null;
}

export async function listSubscriptions({
  activeOnly = false,
  expiringWithinDays,
  now = new Date(),
}: {
  activeOnly?: boolean;
  expiringWithinDays?: number;
  now?: Date;
} = {}): Promise<SubscriptionWithEmail[]> {
  const conditions: SQL[] = [];

  if (activeOnly) {
    conditions.push(
      eq(subscription.status, "active"),
      lte(subscription.startsAt, now),
      gt(subscription.endsAt, now)
    );
  }

  if (typeof expiringWithinDays === "number") {
    conditions.push(
      gt(subscription.endsAt, now),
      lte(subscription.endsAt, addDays(now, expiringWithinDays))
    );
  }

  const rows = await db
    .select({ row: subscription, userEmail: user.email })
    .from(subscription)
    .leftJoin(user, eq(subscription.userId, user.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(subscription.endsAt));

  return rows.map(({ row, userEmail }) => ({ ...row, userEmail }));
}

/** Ends a subscription at once. The reviewer is logged, not stored. */
export async function revokeSubscription({
  reviewer,
  subscriptionId,
}: {
  subscriptionId: string;
  reviewer: string;
}): Promise<Subscription> {
  const now = new Date();
  const [updated] = await db
    .update(subscription)
    .set({ endsAt: now, status: "revoked" })
    .where(eq(subscription.id, subscriptionId))
    .returning();

  if (!updated) {
    throw new ChatbotError("not_found:payment");
  }

  console.info("subscription revoked", { reviewer, subscriptionId });

  return updated;
}

export async function extendSubscription({
  days,
  subscriptionId,
}: {
  subscriptionId: string;
  days: number;
}): Promise<Subscription> {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(subscription)
      .where(eq(subscription.id, subscriptionId))
      .for("update");

    if (!existing) {
      throw new ChatbotError("not_found:payment");
    }

    const [updated] = await tx
      .update(subscription)
      .set({ endsAt: addDays(existing.endsAt, days) })
      .where(eq(subscription.id, subscriptionId))
      .returning();

    return updated;
  });
}

/** Asks for a refund. Only inside the window, and once per payment. */
export async function createRefundRequest({
  now,
  paymentId,
  reason,
  userId,
}: {
  userId: string;
  paymentId: string;
  reason: string;
  now: Date;
}): Promise<RefundRequest> {
  const [existing] = await db
    .select()
    .from(payment)
    .where(and(eq(payment.id, paymentId), eq(payment.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new ChatbotError("not_found:payment");
  }

  const [openRequest] = await db
    .select({ status: refundRequest.status })
    .from(refundRequest)
    .where(eq(refundRequest.paymentId, paymentId))
    .limit(1);

  const eligible = isRefundEligible({
    approvedAt: existing.reviewedAt,
    hasOpenRequest: openRequest?.status === "open",
    now,
    paymentStatus: existing.status,
  });

  if (!eligible) {
    throw new ChatbotError("forbidden:refund");
  }

  try {
    const [created] = await db
      .insert(refundRequest)
      .values({
        paymentId,
        reason,
        status: "open",
        userId,
      })
      .returning();

    return created;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ChatbotError("forbidden:refund", { cause: error });
    }

    throw new ChatbotError("bad_request:database", { cause: error });
  }
}

export async function listRefundRequests({
  status,
}: {
  status?: RefundRequest["status"];
} = {}): Promise<RefundRequestDetails[]> {
  const rows = await db
    .select({
      amountInr: payment.amountInr,
      approvedAt: payment.reviewedAt,
      planId: payment.planId,
      row: refundRequest,
      userEmail: user.email,
    })
    .from(refundRequest)
    .innerJoin(payment, eq(refundRequest.paymentId, payment.id))
    .leftJoin(user, eq(refundRequest.userId, user.id))
    .where(status ? eq(refundRequest.status, status) : undefined)
    .orderBy(desc(refundRequest.createdAt));

  return rows.map(({ row, ...rest }) => ({ ...row, ...rest }));
}

/**
 * Records what the admin did after paying the student back by hand. Refunding
 * marks the payment refunded and ends access at once.
 */
export async function resolveRefundRequest({
  requestId,
  resolution,
  resolver,
}: {
  requestId: string;
  resolution: "refunded" | "declined";
  resolver: string;
}): Promise<{
  refundRequest: RefundRequest;
  payment: Payment | null;
  subscription: Subscription | null;
}> {
  const now = new Date();

  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(refundRequest)
      .where(eq(refundRequest.id, requestId))
      .for("update");

    if (!existing) {
      throw new ChatbotError("not_found:refund");
    }

    if (existing.status !== "open") {
      throw new ChatbotError(
        "bad_request:api",
        "This refund request is already resolved."
      );
    }

    const [updatedRequest] = await tx
      .update(refundRequest)
      .set({ resolvedAt: now, resolvedBy: resolver, status: resolution })
      .where(eq(refundRequest.id, requestId))
      .returning();

    if (resolution === "declined") {
      return {
        payment: null,
        refundRequest: updatedRequest,
        subscription: null,
      };
    }

    const [updatedPayment] = await tx
      .update(payment)
      .set({ status: "refunded" })
      .where(eq(payment.id, existing.paymentId))
      .returning();

    const [updatedSubscription] = await tx
      .update(subscription)
      .set({ endsAt: now, status: "refunded" })
      .where(eq(subscription.paymentId, existing.paymentId))
      .returning();

    return {
      payment: updatedPayment ?? null,
      refundRequest: updatedRequest,
      subscription: updatedSubscription ?? null,
    };
  });
}

/** Subscriptions ending within three days that have had no reminder yet. */
export async function listSubscriptionsNeedingReminder(
  now: Date
): Promise<ReminderDue[]> {
  const rows = await db
    .select({
      endsAt: subscription.endsAt,
      planId: subscription.planId,
      subscriptionId: subscription.id,
      userEmail: user.email,
      userId: subscription.userId,
    })
    .from(subscription)
    .leftJoin(user, eq(subscription.userId, user.id))
    .where(
      and(
        eq(subscription.status, "active"),
        isNull(subscription.reminderSentAt),
        gt(subscription.endsAt, now),
        lte(subscription.endsAt, addDays(now, RENEW_BANNER_DAYS))
      )
    )
    .orderBy(subscription.endsAt);

  return rows;
}

export async function markReminderSent(
  subscriptionId: string,
  at: Date
): Promise<void> {
  await db
    .update(subscription)
    .set({ reminderSentAt: at })
    .where(eq(subscription.id, subscriptionId));
}
