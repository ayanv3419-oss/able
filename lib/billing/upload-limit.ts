import type { Plan } from "@/lib/plans";

/**
 * Null when the student may upload another file today, otherwise the reason
 * shown to them. The count resets at midnight India time, like messages.
 */
export function uploadLimitError(
  plan: Pick<Plan, "dailyUploads">,
  usedToday: number
): string | null {
  const cap = plan.dailyUploads;
  if (cap === null || usedToday < cap) {
    return null;
  }
  return `You've used today's ${cap} uploads. They reset at midnight India time.`;
}
