import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { BillingPageHeader } from "@/components/billing/billing-page-header";
import { CopyUpiButton } from "@/components/billing/copy-upi-button";
import { UtrForm } from "@/components/billing/utr-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getPaymentConfig } from "@/lib/billing/payment-config";
import { buildUpiUri } from "@/lib/billing/rules";
import { getPendingPaymentByUserId } from "@/lib/db/billing-queries";
import { getPlan, isPlanId } from "@/lib/plans";

const QR_SIZE_PX = 260;
const USER_ID_NOTE_LENGTH = 6;

type Params = { plan: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { plan } = await params;

  return { title: isPlanId(plan) ? `Pay for ${getPlan(plan).name}` : "Pay" };
}

/**
 * `params` and `auth()` are both dynamic APIs under `cacheComponents`, so the
 * whole pay flow lives in one component inside a `<Suspense>` boundary. Only
 * the static header prerenders outside it.
 */
async function PayContent({ params }: { params: Promise<Params> }) {
  const { plan: planParam } = await params;

  if (!isPlanId(planParam)) {
    notFound();
  }

  const session = await auth();

  // proxy.ts already requires a session for every non-public path; this is a
  // defensive fallback in case that ever changes.
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/pay/${planParam}`)}`);
  }

  const plan = getPlan(planParam);
  if (await getPendingPaymentByUserId(session.user.id)) {
    redirect("/billing");
  }
  const { upiId, payeeName } = await getPaymentConfig();
  if (!upiId || !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(upiId)) {
    return (
      <p className="text-center text-muted-foreground" role="status">
        Payments are not available yet. Please check back soon.
      </p>
    );
  }
  const note = `Able ${plan.id} ${session.user.id.slice(0, USER_ID_NOTE_LENGTH)}`;
  const upiUri = buildUpiUri({
    amountInr: plan.priceInr,
    note,
    payeeName,
    upiId,
  });
  const qrDataUrl = await QRCode.toDataURL(upiUri, {
    margin: 1,
    width: QR_SIZE_PX,
  });

  return (
    <>
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">
          Pay for {plan.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          ₹{plan.priceInr.toLocaleString("en-IN")} for 30 days, by UPI.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-background p-6">
        <Image
          alt={`UPI QR code to pay ₹${plan.priceInr} to ${payeeName}`}
          height={QR_SIZE_PX}
          src={qrDataUrl}
          unoptimized
          width={QR_SIZE_PX}
        />
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{upiId}</span>
          <CopyUpiButton upiId={upiId} />
        </div>
        <a
          className="text-center text-primary text-sm underline underline-offset-4"
          href={upiUri}
        >
          Pay with UPI app
        </a>
        <p className="text-center text-muted-foreground text-xs">
          Scan the QR code or tap the link above on your phone. The note "{note}
          " is filled in for you.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-6">
        <h2 className="font-medium text-base">
          After you've paid, tell us the reference number
        </h2>
        <UtrForm planId={plan.id} />
      </div>
    </>
  );
}

function PayContentFallback() {
  return (
    <>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-48 w-full" />
    </>
  );
}

export default function Page({ params }: { params: Promise<Params> }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <BillingPageHeader />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-12">
        <Suspense fallback={<PayContentFallback />}>
          <PayContent params={params} />
        </Suspense>
      </main>
    </div>
  );
}
