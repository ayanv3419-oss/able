import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { BillingPageHeader } from "@/components/billing/billing-page-header";
import { WaitingWatcher } from "@/components/billing/waiting-watcher";
import { SignOutForm } from "@/components/chat/sign-out-form";
import { Skeleton } from "@/components/ui/skeleton";
import { gateStudent } from "@/lib/access";
import { getPendingPaymentByUserId } from "@/lib/db/billing-queries";
import { getPlan } from "@/lib/plans";

export const metadata: Metadata = { title: "Waiting for approval" };

/** The screen between a student's request and the owner's decision. */
async function WaitingContent() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/waiting");
  }

  await gateStudent(session.user.id, "waiting");
  const pending = await getPendingPaymentByUserId(session.user.id);

  if (!pending) {
    redirect("/pricing");
  }

  const sentAt = pending.createdAt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  return (
    <>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">Request sent</h1>
        <p className="text-muted-foreground text-sm">
          The owner checks your payment in their UPI app and then allows your
          request. Able opens here as soon as that happens.
        </p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-border bg-background p-5 text-sm">
        <dt className="text-muted-foreground">Plan</dt>
        <dd>{getPlan(pending.planId).name}</dd>
        <dt className="text-muted-foreground">Amount</dt>
        <dd>₹{pending.amountInr.toLocaleString("en-IN")}</dd>
        <dt className="text-muted-foreground">Sent</dt>
        <dd>{sentAt} IST</dd>
        <dt className="text-muted-foreground">Status</dt>
        <dd>Waiting for approval</dd>
      </dl>
      <WaitingWatcher />
      {session.localPreview ? null : (
        <div className="self-center text-sm">
          <SignOutForm />
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <BillingPageHeader />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-12">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <WaitingContent />
        </Suspense>
      </main>
    </div>
  );
}
