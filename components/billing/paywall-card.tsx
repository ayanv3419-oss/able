import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { BlockReason, EntitlementSummary } from "@/lib/entitlements";

type Copy = {
  title: string;
  body: string;
  cta: string;
  href: string;
};

const COPY: Record<BlockReason, Copy> = {
  "daily-limit": {
    body: "You have used all of today's messages. They reset at midnight India time.",
    cta: "See plans",
    href: "/pricing",
    title: "Daily limit reached",
  },
  expired: {
    body: "Your plan has ended. Renew to keep chatting; your old chats stay readable.",
    cta: "Renew plan",
    href: "/pricing",
    title: "Plan expired",
  },
  "fair-use-limit": {
    body: "You have reached today's fair-use limit. It resets at midnight India time.",
    cta: "See plans",
    href: "/pricing",
    title: "Fair-use limit reached",
  },
  "no-plan": {
    body: "Able is a paid app. Choose a plan to start chatting.",
    cta: "See plans",
    href: "/pricing",
    title: "Choose a plan",
  },
  pending: {
    body: "Your payment is waiting for approval. You will get an email once it is approved.",
    cta: "Check payment status",
    href: "/billing",
    title: "Waiting for approval",
  },
};

/**
 * Replaces the composer when a student cannot send, with one card per block
 * reason. Renders nothing when sending is allowed.
 */
export function PaywallCard({
  entitlement,
}: {
  entitlement: EntitlementSummary;
}) {
  const reason = entitlement.blockReason;

  if (entitlement.canSend || !reason) {
    return null;
  }

  const copy = COPY[reason];

  return (
    <section
      aria-labelledby="paywall-title"
      className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 text-center"
    >
      <h2 className="font-medium text-base" id="paywall-title">
        {copy.title}
      </h2>
      <p className="text-muted-foreground text-sm">{copy.body}</p>
      <div className="flex justify-center">
        <Button asChild size="sm">
          <Link href={copy.href}>{copy.cta}</Link>
        </Button>
      </div>
    </section>
  );
}
