import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { BillingPageHeader } from "@/components/billing/billing-page-header";
import { PlanCard } from "@/components/billing/plan-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PLAN_IDS, PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing",
};

/** The plan shown with a "Most popular" badge. The owner can change this. */
const HIGHLIGHTED_PLAN_ID = "plus";

/**
 * Reads the session, which is a dynamic API under `cacheComponents`, so it
 * lives in its own component inside a `<Suspense>` boundary — the static
 * shell around it (heading, support line) still prerenders.
 */
async function PlanCards() {
  const session = await auth();
  const isSignedIn = Boolean(session?.user);

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PLAN_IDS.map((id) => (
        <PlanCard
          highlight={id === HIGHLIGHTED_PLAN_ID}
          isSignedIn={isSignedIn}
          key={id}
          plan={PLANS[id]}
        />
      ))}
    </div>
  );
}

function PlanCardsFallback() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PLAN_IDS.map((id) => (
        <Skeleton className="h-96 w-full" key={id} />
      ))}
    </div>
  );
}

export default function Page() {
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || "[support email]";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <BillingPageHeader />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-5 py-12">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-semibold text-3xl tracking-tight">
            Plans for Able
          </h1>
          <p className="text-muted-foreground text-sm">
            Every plan includes the same Able, at a reasoning effort and message
            allowance that fits how much you chat.
          </p>
        </div>

        <Suspense fallback={<PlanCardsFallback />}>
          <PlanCards />
        </Suspense>

        <p className="text-center text-muted-foreground text-sm">
          Payment is by UPI only. Studying outside India?{" "}
          <a
            className="underline underline-offset-4"
            href={`mailto:${supportEmail}`}
          >
            {supportEmail}
          </a>
        </p>
      </main>
    </div>
  );
}
