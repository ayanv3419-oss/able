/**
 * Pure billing rules, as decided in docs/SPEC.md §7.
 *
 * Nothing here touches the database or the network, so both server actions and
 * unit tests can use it.
 */

import type { Payment } from "../db/schema";
import { PLAN_DAYS, type PlanId } from "../plans";

/** A refund can be requested within this many days of approval. */
export const REFUND_WINDOW_DAYS = 7;

/** The renew banner and the reminder email start this many days before the end. */
export const RENEW_BANNER_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;
const UTR_MIN_LENGTH = 10;
const UTR_MAX_LENGTH = 24;
const UTR_ALLOWED = /^[A-Z0-9]+$/;
const UTR_SEPARATORS = /[\s-]/g;

export type NormalizedUtr =
  | { ok: true; utr: string }
  | { ok: false; error: string };

/**
 * Cleans up a UPI reference number the student typed: spaces and dashes are
 * dropped, letters are upper-cased, and the result must be 10 to 24 letters or
 * digits.
 */
export function normalizeUtr(input: string): NormalizedUtr {
  const utr = input.replace(UTR_SEPARATORS, "").toUpperCase();

  if (utr.length === 0) {
    return {
      error: "Enter the UPI reference number from your payment app.",
      ok: false,
    };
  }

  if (!UTR_ALLOWED.test(utr)) {
    return {
      error: "The UPI reference number can contain only letters and digits.",
      ok: false,
    };
  }

  if (utr.length < UTR_MIN_LENGTH || utr.length > UTR_MAX_LENGTH) {
    return {
      error: `The UPI reference number must be ${UTR_MIN_LENGTH} to ${UTR_MAX_LENGTH} letters or digits.`,
      ok: false,
    };
  }

  return { ok: true, utr };
}

/** The subscription a student is on right now, as far as approval cares. */
export type CurrentSubscription = {
  id: string;
  planId: PlanId;
  endsAt: Date;
};

export type ApprovalInput = {
  /** The student's current subscription, or null when they have none. */
  current: CurrentSubscription | null;
  /** The plan being approved. */
  planId: PlanId;
  /** Approval time. */
  now: Date;
};

export type Approval = {
  startsAt: Date;
  endsAt: Date;
  /** The subscription to mark superseded, or null when nothing is replaced. */
  supersedeId: string | null;
};

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Renewing the same plan extends it: the new period starts where the current
 * one ends. Paying for a different plan starts at once and supersedes the
 * current one. Plan changes are never pro-rated.
 */
export function computeApproval({
  current,
  now,
  planId,
}: ApprovalInput): Approval {
  if (current && current.planId === planId) {
    return {
      endsAt: addDays(current.endsAt, PLAN_DAYS),
      startsAt: current.endsAt,
      supersedeId: null,
    };
  }

  return {
    endsAt: addDays(now, PLAN_DAYS),
    startsAt: now,
    supersedeId: current?.id ?? null,
  };
}

export type RefundEligibility = {
  paymentStatus: Payment["status"];
  /** When the payment was approved, which is when the window opens. */
  approvedAt: Date | null;
  now: Date;
  /** True when a refund request for this payment is already open. */
  hasOpenRequest: boolean;
};

/** Only an approved payment, inside the window, with no open request. */
export function isRefundEligible({
  approvedAt,
  hasOpenRequest,
  now,
  paymentStatus,
}: RefundEligibility): boolean {
  if (paymentStatus !== "approved" || !approvedAt || hasOpenRequest) {
    return false;
  }

  const deadline = addDays(approvedAt, REFUND_WINDOW_DAYS);

  return now.getTime() <= deadline.getTime();
}

/** Whole days of access left, counting a part day as a day. Never negative. */
export function daysLeft(endsAt: Date, now: Date): number {
  const remaining = endsAt.getTime() - now.getTime();

  if (remaining <= 0) {
    return 0;
  }

  return Math.ceil(remaining / DAY_MS);
}

export type UpiUriInput = {
  upiId: string;
  payeeName: string;
  amountInr: number;
  /** Short note shown in the payment app, for example "Able plus 1a2b3c". */
  note: string;
};

/** Builds the `upi://pay` URI behind the QR code and the phone payment link. */
export function buildUpiUri({
  amountInr,
  note,
  payeeName,
  upiId,
}: UpiUriInput): string {
  const params = [
    `pa=${encodeURIComponent(upiId)}`,
    `pn=${encodeURIComponent(payeeName)}`,
    `am=${encodeURIComponent(String(amountInr))}`,
    "cu=INR",
    `tn=${encodeURIComponent(note)}`,
  ];

  return `upi://pay?${params.join("&")}`;
}
