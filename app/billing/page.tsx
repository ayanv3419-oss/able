import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { BillingPageHeader } from "@/components/billing/billing-page-header";
import { PaymentHistoryTable } from "@/components/billing/payment-history-table";
import { PaywallCard } from "@/components/billing/paywall-card";
import { RefundRequestForm } from "@/components/billing/refund-request-form";
import { UsageBanner } from "@/components/billing/usage-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { gateStudent } from "@/lib/access";
import { isRefundEligible } from "@/lib/billing/rules";
import { listPaymentsByUserId } from "@/lib/db/billing-queries";
import { db } from "@/lib/db/client";
import { type Payment, refundRequest } from "@/lib/db/schema";
import { getPlan } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Billing",
};

/** Names a payment by plan and date, since requests carry no reference number. */
function paymentLabel(item: Payment): string {
  const date = item.createdAt.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
    year: "numeric",
  });

  return `${getPlan(item.planId).name} payment of ${date}`;
}

/**
 * `auth()` and every query below are dynamic under `cacheComponents`, so
 * this whole section lives inside a `<Suspense>` boundary. The page's own
 * heading still prerenders statically.
 */
async function BillingContent() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/billing");
  }

  const userId = session.user.id;
  const now = new Date();

  const [entitlement, payments] = await Promise.all([
    gateStudent(userId, "billing"),
    listPaymentsByUserId(userId),
  ]);

  const requests = await db
    .select()
    .from(refundRequest)
    .where(eq(refundRequest.userId, userId));
  const refundable = payments.filter((item) =>
    isRefundEligible({
      approvedAt: item.reviewedAt,
      hasOpenRequest: requests.some((request) => request.paymentId === item.id),
      now,
      paymentStatus: item.status,
    })
  );

  return (
    <>
      <UsageBanner entitlement={entitlement} />
      <PaywallCard entitlement={entitlement} />

      {entitlement.status === "none" ? (
        <p className="text-muted-foreground text-sm">
          No active plan.{" "}
          <Link className="underline underline-offset-4" href="/pricing">
            See plans
          </Link>
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-lg">Payment history</h2>
        <PaymentHistoryTable payments={payments} />
      </section>

      {requests.map((request) => {
        const paid = payments.find((item) => item.id === request.paymentId);

        return (
          <p
            className="rounded-xl border p-4 text-sm"
            key={request.id}
            role="status"
          >
            Refund for your {paid ? paymentLabel(paid) : "payment"}:{" "}
            {request.status === "open"
              ? "Awaiting review"
              : request.status === "refunded"
                ? "Paid back"
                : "Declined"}
            .
          </p>
        );
      })}
      {refundable.map((item) => (
        <section
          className="flex flex-col gap-3 rounded-xl border border-border p-5"
          key={item.id}
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-medium text-lg">
              Request a refund — {paymentLabel(item)}
            </h2>
            <p className="text-muted-foreground text-sm">
              Within 7 days of approval, you can ask for your money back. The
              owner pays you back over UPI by hand.
            </p>
          </div>
          <RefundRequestForm paymentId={item.id} />
        </section>
      ))}
    </>
  );
}

function BillingContentFallback() {
  return (
    <>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-40 w-full" />
    </>
  );
}

export default function Page() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <BillingPageHeader />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-12">
        <h1 className="font-semibold text-2xl tracking-tight">Billing</h1>

        <Suspense fallback={<BillingContentFallback />}>
          <BillingContent />
        </Suspense>
      </main>
    </div>
  );
}
