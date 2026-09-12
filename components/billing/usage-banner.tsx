import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EntitlementSummary } from "@/lib/entitlements";
import { getPlan } from "@/lib/plans";

const PERCENT = 100;

/**
 * Plan status strip: messages left today, days left, and a renew prompt in the
 * last three days. Renders nothing when there is no active plan, because the
 * paywall card speaks for that case.
 */
export function UsageBanner({
  entitlement,
}: {
  entitlement: EntitlementSummary;
}) {
  if (entitlement.status !== "active" || !entitlement.planId) {
    return null;
  }

  const { daysLeft, displayUnlimited, messagesLeftToday, planId, planName } =
    entitlement;
  const { dailyMessages } = getPlan(planId);
  const left = messagesLeftToday ?? 0;
  const usedRatio =
    dailyMessages > 0 ? Math.min(1, Math.max(0, left / dailyMessages)) : 0;

  return (
    <section
      aria-label="Plan usage"
      className="flex flex-col gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm"
    >
      <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
        {planName ? <Badge variant="secondary">{planName}</Badge> : null}
        <span>
          {displayUnlimited
            ? "Unlimited messages"
            : `${left} messages left today`}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {daysLeft} {daysLeft === 1 ? "day" : "days"} left
        </span>
        {entitlement.showRenewBanner ? (
          <span
            className="flex items-center gap-2 text-foreground"
            role="status"
          >
            Your plan ends soon.
            <Button asChild size="xs" variant="outline">
              <Link href="/pricing">Renew</Link>
            </Button>
          </span>
        ) : null}
      </div>

      {displayUnlimited ? null : (
        <div
          aria-label="Messages left today"
          aria-valuemax={dailyMessages}
          aria-valuemin={0}
          aria-valuenow={left}
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${usedRatio * PERCENT}%` }}
          />
        </div>
      )}
    </section>
  );
}
