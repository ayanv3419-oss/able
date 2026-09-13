import Link from "next/link";
import { Button } from "@/components/ui/button";
import { planNotice } from "@/lib/billing/plan-notice";
import type { EntitlementSummary } from "@/lib/entitlements";

/**
 * One line above the message box, shown only when few messages are left
 * today or the plan ends soon. On a normal day it renders nothing.
 */
export function PlanNotice({
  entitlement,
}: {
  entitlement: EntitlementSummary;
}) {
  const notice = planNotice(entitlement);
  if (!notice) {
    return null;
  }

  return (
    <p
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-muted-foreground text-xs"
      role="status"
    >
      <span>{notice.text}</span>
      {notice.renew ? (
        <Button asChild size="xs" variant="outline">
          <Link href="/pricing">Renew</Link>
        </Button>
      ) : null}
    </p>
  );
}
