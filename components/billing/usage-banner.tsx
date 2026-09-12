import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EntitlementSummary } from "@/lib/entitlements";

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
  if (entitlement.status !== "active") {
    return null;
  }

  const { daysLeft, displayUnlimited, messagesLeftToday, planName } =
    entitlement;
  const messages = displayUnlimited
    ? "Unlimited messages"
    : `${messagesLeftToday ?? 0} messages left today`;

  return (
    <section
      aria-label="Plan usage"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-muted-foreground text-sm"
    >
      {planName ? <Badge variant="secondary">{planName}</Badge> : null}
      <span>{messages}</span>
      <span aria-hidden="true">·</span>
      <span>
        {daysLeft} {daysLeft === 1 ? "day" : "days"} left
      </span>
      {entitlement.showRenewBanner ? (
        <span className="flex items-center gap-2 text-foreground" role="status">
          Your plan ends soon.
          <Button asChild size="xs" variant="outline">
            <Link href="/pricing">Renew</Link>
          </Button>
        </span>
      ) : null}
    </section>
  );
}
