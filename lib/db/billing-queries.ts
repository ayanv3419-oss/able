import "server-only";

import { and, desc, eq, gt, isNull, lte, type SQL } from "drizzle-orm";
import {
  computeApproval,
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
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
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
 * Records a payment a student says they made. A student may have only one
 * pending payment, and a UPI reference may be submitted only once.
 */
export async function createPayment({
  amountInr,
  planId,
  studentNote,
  userId,
  utr,
}: {
  userId: string;
  planId: PlanId;
  amountInr: number;
  utr: string;
  studentNote?: string | null;
}): Promise<Payment> {
  const normalizedUtr = utr.trim().toUpperCase();
  const pending = await getPendingPaymentByUserId(userId);

  if (pending) {
    throw new ChatbotError("forbidden:payment");
  }

  const [duplicate] = await db
    .select({ id: payment.id })
    .from(payment)
    .where(eq(payment.utr, normalizedUtr))
    .limit(1);

  if (duplicate) {
    throw new ChatbotError("bad_request:payment");
  }

  try {
    const [created] = await db
      .insert(payment)
      .values({
        amountInr,
        planId,
        status: "pending",
        studentNote: studentNote ?? null,
        userId,
        utr: normalizedUtr,
      })
      .returning();

    return created;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ChatbotError("bad_request:payment", { cause: error });
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

    const [current] = await tx
      .select()
      .from(subscription)
      .where(
        and(
          eq(subscription.userId, existing.userId),
          eq(subscription.status, "active"),
          lte(subscription.startsAt, now),
          gt(subscription.endsAt, now)
        )
      )
      .orderBy(desc(subscription.endsAt))
      .limit(1);

    const approval = computeApproval({
      current: current
        ? { endsAt: current.endsAt, id: current.id, planId: current.planId }
        : null,
      now,
      planId: existing.planId,
    });

    if (approval.supersedeId) {
      await tx
        .update(subscription)
        .set({ endsAt: now, status: "superseded" })
        .where(eq(subscription.id, approval.supersedeId));
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

export async function rejectPayment({
  paymentId,
  reviewNote,
  reviewer,
}: {
  paymentId: string;
  reviewer: string;
  reviewNote: string;
}): Promise<Payment> {
  const [updated] = await db
    .update(payment)
    .set({
      reviewedAt: new Date(),
      reviewedBy: reviewer,
      reviewNote,
      status: "rejected",
    })
    .where(and(eq(payment.id, paymentId), eq(payment.status, "pending")))
    .returning();

  if (!updated) {
    throw new ChatbotError("not_found:payment");
  }

  return updated;
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
