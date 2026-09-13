import type { EntitlementSummary } from "@/lib/entitlements";

/** Below this many messages left today, the chat screen says how many remain. */
export const LOW_MESSAGES = 10;

export type PlanNotice = {
  /** Shows a Renew button, in the plan's last days. */
  renew: boolean;
  text: string;
};

function count(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

/**
 * The one line above the message box, or null on a normal day. It appears
 * only when fewer than LOW_MESSAGES messages are left today or the plan ends
 * within its renew window. The full usage card lives in Settings and Billing.
 */
export function planNotice(entitlement: EntitlementSummary): PlanNotice | null {
  if (entitlement.status !== "active" || !entitlement.canSend) {
    return null;
  }

  const parts: string[] = [];
  const left = entitlement.messagesLeftToday;
  if (!entitlement.displayUnlimited && left !== null && left < LOW_MESSAGES) {
    parts.push(`${count(left, "message", "messages")} left today.`);
  }
  if (entitlement.showRenewBanner) {
    parts.push(
      entitlement.daysLeft > 0
        ? `Your plan ends in ${count(entitlement.daysLeft, "day", "days")}.`
        : "Your plan ends today."
    );
  }

  if (parts.length === 0) {
    return null;
  }
  return { renew: entitlement.showRenewBanner, text: parts.join(" ") };
}
