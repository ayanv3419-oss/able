/**
 * What a student is allowed to do right now: their plan, how many messages are
 * left today, and why sending is blocked when it is. See docs/SPEC.md §5 and §7.
 */

import { RENEW_BANNER_DAYS, daysLeft as remainingDays } from "./billing/rules";
import {
  getCurrentSubscription,
  getLatestSubscription,
  getPendingPaymentByUserId,
} from "./db/billing-queries";
import { countProjects } from "./db/project-queries";
import type { Subscription } from "./db/schema";
import { sumCountedCostSince } from "./db/usage-queries";
import { istDayStart, messagesLeft } from "./metering";
import { getPlan, type PlanId, type ReasoningEffort } from "./plans";

export type BlockReason =
  | "no-plan"
  | "pending"
  | "expired"
  | "daily-limit"
  | "fair-use-limit";

export type EntitlementStatus = "none" | "pending" | "active" | "expired";

export type EntitlementSummary = {
  planId: PlanId | null;
  planName: string | null;
  status: EntitlementStatus;
  /** End of the current period as an ISO string, or null when there is none. */
  endsAt: string | null;
  daysLeft: number;
  /** Null when there is no active plan. */
  messagesLeftToday: number | null;
  displayUnlimited: boolean;
  canSend: boolean;
  blockReason: BlockReason | null;
  reasoningEffort: ReasoningEffort;
  /** Project folders allowed: a number, or null for unlimited. */
  projectLimit: number | null;
  projectsUsed: number;
  hasPendingPayment: boolean;
  showRenewBanner: boolean;
};

/** The subscription fields entitlement decisions need. */
export type EntitlementSubscription = {
  planId: PlanId;
  status: Subscription["status"];
  startsAt: Date;
  endsAt: Date;
};

export type EntitlementInput = {
  now: Date;
  /** The current subscription, or the most recent one when none is current. */
  subscription: EntitlementSubscription | null;
  hasPendingPayment: boolean;
  projectsUsed: number;
  /** Counted cost since midnight Asia/Kolkata, in micro-dollars. */
  spentMicrosToday: number;
};

const DEFAULT_REASONING_EFFORT: ReasoningEffort = "low";

function isCurrent(subscription: EntitlementSubscription, now: Date): boolean {
  return (
    subscription.status === "active" &&
    subscription.startsAt.getTime() <= now.getTime() &&
    subscription.endsAt.getTime() > now.getTime()
  );
}

export function computeEntitlement({
  hasPendingPayment,
  now,
  projectsUsed,
  spentMicrosToday,
  subscription,
}: EntitlementInput): EntitlementSummary {
  const current =
    subscription && isCurrent(subscription, now) ? subscription : null;

  if (!current) {
    const status: EntitlementStatus = hasPendingPayment
      ? "pending"
      : subscription
        ? "expired"
        : "none";
    const blockReason: BlockReason = hasPendingPayment
      ? "pending"
      : subscription
        ? "expired"
        : "no-plan";

    return {
      blockReason,
      canSend: false,
      daysLeft: 0,
      displayUnlimited: false,
      endsAt: subscription ? subscription.endsAt.toISOString() : null,
      hasPendingPayment,
      messagesLeftToday: null,
      planId: subscription?.planId ?? null,
      planName: subscription ? getPlan(subscription.planId).name : null,
      projectLimit: 0,
      projectsUsed,
      reasoningEffort: DEFAULT_REASONING_EFFORT,
      showRenewBanner: false,
      status,
    };
  }

  const plan = getPlan(current.planId);
  const left = messagesLeft(plan, spentMicrosToday);
  const canSend = left >= 1;
  const daysRemaining = remainingDays(current.endsAt, now);

  return {
    blockReason: canSend
      ? null
      : plan.displayUnlimited
        ? "fair-use-limit"
        : "daily-limit",
    canSend,
    daysLeft: daysRemaining,
    displayUnlimited: plan.displayUnlimited,
    endsAt: current.endsAt.toISOString(),
    hasPendingPayment,
    messagesLeftToday: left,
    planId: plan.id,
    planName: plan.name,
    projectLimit: plan.projectFolderLimit,
    projectsUsed,
    reasoningEffort: plan.reasoningEffort,
    showRenewBanner: daysRemaining <= RENEW_BANNER_DAYS,
    status: "active",
  };
}

/** Loads everything computeEntitlement needs for one student. */
export async function getEntitlement(
  userId: string,
  now = new Date()
): Promise<EntitlementSummary> {
  const [current, pendingPayment, projectsUsed] = await Promise.all([
    getCurrentSubscription(userId, now),
    getPendingPaymentByUserId(userId),
    countProjects(userId),
  ]);

  const subscription = current ?? (await getLatestSubscription(userId));
  const spentMicrosToday = current
    ? await sumCountedCostSince({ since: istDayStart(now), userId })
    : 0;

  return computeEntitlement({
    hasPendingPayment: pendingPayment !== null,
    now,
    projectsUsed,
    spentMicrosToday,
    subscription: subscription
      ? {
          endsAt: subscription.endsAt,
          planId: subscription.planId,
          startsAt: subscription.startsAt,
          status: subscription.status,
        }
      : null,
  });
}

/** True when the student's plan still has room for another project folder. */
export async function canCreateProject(userId: string): Promise<boolean> {
  const entitlement = await getEntitlement(userId);

  if (entitlement.status !== "active") {
    return false;
  }

  if (entitlement.projectLimit === null) {
    return true;
  }

  return entitlement.projectsUsed < entitlement.projectLimit;
}
