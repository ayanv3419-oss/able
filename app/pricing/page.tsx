import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { BillingPageHeader } from "@/components/billing/billing-page-header";
import { PlanCard } from "@/components/billing/plan-card";
import { SignOutForm } from "@/components/chat/sign-out-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getChatsByUserId } from "@/lib/db/queries";
import { type EntitlementSummary, getEntitlement } from "@/lib/entitlements";
import { PLAN_IDS, PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing",
};

/** The plan marked "Popular". The owner can change this. */
const HIGHLIGHTED_PLAN_ID = "plus";

/** Tells a signed-in student why the app opened on the plan page. */
function StatusBanner({
  entitlement,
  latestChatId,
}: {
  entitlement: EntitlementSummary;
  latestChatId: string | null;
}) {
  if (entitlement.status === "expired") {
    return (
      <p className="rounded-xl border border-border bg-muted/40 p-4 text-center text-sm">
        Your plan has ended. Pick a plan to keep chatting.
        {latestChatId ? (
          <>
            {" "}
            <Link
              className="underline underline-offset-4"
              href={`/chat/${latestChatId}`}
            >
              Open your old chats
            </Link>
          </>
        ) : null}
      </p>
    );
  }

  if (entitlement.status === "pending") {
    return (
      <p className="rounded-xl border border-border bg-muted/40 p-4 text-center text-sm">
        Your request is waiting for the owner to allow it.{" "}
        <Link className="underline underline-offset-4" href="/waiting">
          See request status
        </Link>
      </p>
    );
  }

  if (entitlement.status === "none") {
    return (
      <p className="rounded-xl border border-border bg-muted/40 p-4 text-center text-sm">
        Pick a plan to start using Able. Pay by UPI, tap Request, and the owner
        unlocks Able for you.
      </p>
    );
  }

  return null;
}

/**
 * Reads the session, which is a dynamic API under `cacheComponents`, so it
 * lives in its own component inside a `<Suspense>` boundary — the static
 * shell around it (heading, support line) still prerenders.
 */
async function PlanCards() {
  const session = await auth();
  const userId = session?.user?.id;
  const entitlement = userId ? await getEntitlement(userId) : null;

  if (entitlement?.status === "blocked") {
    redirect("/blocked");
  }

  const latestChatId =
    userId && entitlement?.status === "expired"
      ? ((
          await getChatsByUserId({
            endingBefore: null,
            id: userId,
            limit: 1,
            startingAfter: null,
          })
        ).chats[0]?.id ?? null)
      : null;

  return (
    <>
      {entitlement ? (
        <StatusBanner entitlement={entitlement} latestChatId={latestChatId} />
      ) : null}
      <div className="grid gap-5 md:grid-cols-3">
        {PLAN_IDS.map((id) => (
          <PlanCard
            highlight={id === HIGHLIGHTED_PLAN_ID}
            isSignedIn={Boolean(session?.user)}
            key={id}
            plan={PLANS[id]}
          />
        ))}
      </div>
      {session?.user && !session.localPreview ? (
        <div className="self-center text-sm">
          <SignOutForm />
        </div>
      ) : null}
    </>
  );
}

function PlanCardsFallback() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PLAN_IDS.map((id) => (
        <Skeleton className="h-96 w-full rounded-2xl" key={id} />
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
            Choose the reasoning, project folders and daily allowances that fit
            the way you study.
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
