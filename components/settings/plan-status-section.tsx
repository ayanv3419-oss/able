import Link from "next/link";
import { UsageBanner } from "@/components/billing/usage-banner";
import { Button } from "@/components/ui/button";
import type { EntitlementSummary } from "@/lib/entitlements";

const STATUS_MESSAGE: Record<string, string> = {
  expired: "Your plan has expired. Choose a plan to keep chatting.",
  none: "You don't have a plan yet. Choose one to start chatting.",
  pending: "Your payment is waiting for the owner's approval.",
};

/**
 * Plan status (SPEC §7 Settings, c). Reuses UsageBanner rather than
 * re-deriving messages-left and days-left, and sends anything about payments
 * or refunds to /billing and /pricing, which another agent owns.
 */
export function PlanStatusSection({
  entitlement,
}: {
  entitlement: EntitlementSummary;
}) {
  const statusMessage = STATUS_MESSAGE[entitlement.status];

  return (
    <div className="flex flex-col gap-3">
      <UsageBanner entitlement={entitlement} />
      {statusMessage ? (
        <p className="text-muted-foreground text-sm">{statusMessage}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/pricing">
            {entitlement.status === "active" ? "Change plan" : "Choose a plan"}
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/billing">Payment history &amp; refunds</Link>
        </Button>
      </div>
    </div>
  );
}
