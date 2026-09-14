import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { BillingPageHeader } from "@/components/billing/billing-page-header";
import { SignOutForm } from "@/components/chat/sign-out-form";
import { Skeleton } from "@/components/ui/skeleton";
import { gateStudent } from "@/lib/access";

export const metadata: Metadata = { title: "Request rejected" };

/** What a student sees after the owner rejects their request. */
async function BlockedContent() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  await gateStudent(session.user.id, "blocked");
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || "[support email]";

  return (
    <>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">
          Request rejected
        </h1>
        <p className="text-muted-foreground text-sm">
          The owner could not match your payment, so your Able account is
          blocked. If you paid, email your payment details and a screenshot of
          the UPI transaction, and the owner can unblock you.
        </p>
      </div>
      <a
        className="self-center underline underline-offset-4"
        href={`mailto:${supportEmail}`}
      >
        {supportEmail}
      </a>
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
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <BlockedContent />
        </Suspense>
      </main>
    </div>
  );
}
