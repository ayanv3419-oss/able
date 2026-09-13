"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/app/admin/admin-auth";
import { PAYMENT_REJECTION_MESSAGE } from "@/lib/billing/rules";
import { getUserById } from "@/lib/db/account-queries";
import { approvePayment, rejectPayment } from "@/lib/db/billing-queries";
import { sendPaymentReviewEmail } from "@/lib/email";
import { ChatbotError } from "@/lib/errors";
import { getPlan } from "@/lib/plans";

function requirePaymentId(formData: FormData): string {
  const paymentId = formData.get("paymentId");

  if (!z.uuid().safeParse(paymentId).success || typeof paymentId !== "string") {
    throw new ChatbotError("bad_request:api", "Missing payment id.");
  }

  return paymentId;
}

async function approve(paymentId: string, email: string) {
  const result = await approvePayment({
    now: new Date(),
    paymentId,
    reviewer: email,
  });
  const student = await getUserById(result.subscription.userId);
  if (student) {
    await sendPaymentReviewEmail({
      approved: true,
      endsAt: result.subscription.endsAt,
      planName: getPlan(result.subscription.planId).name,
      startsAt: result.subscription.startsAt,
      to: student.email,
    });
  }
}

async function reject(paymentId: string, email: string) {
  const payment = await rejectPayment({
    paymentId,
    reviewer: email,
    reviewNote: PAYMENT_REJECTION_MESSAGE,
  });
  const student = payment.userId ? await getUserById(payment.userId) : null;
  if (student) {
    await sendPaymentReviewEmail({
      approved: false,
      note: PAYMENT_REJECTION_MESSAGE,
      planName: getPlan(payment.planId).name,
      to: student.email,
    });
  }
}

export type PaymentReviewState = { error: string | null };

export async function reviewPaymentAction(
  _previous: PaymentReviewState,
  formData: FormData
): Promise<PaymentReviewState> {
  try {
    const { email } = await requireAdmin();
    const paymentId = requirePaymentId(formData);
    const decision = formData.get("decision");
    if (decision === "approve") {
      await approve(paymentId, email);
    } else if (decision === "reject") {
      await reject(paymentId, email);
    } else {
      return { error: "Choose Approve or Reject." };
    }
  } catch (error) {
    if (error instanceof ChatbotError) {
      return {
        error: typeof error.cause === "string" ? error.cause : error.message,
      };
    }
    console.error("Payment review failed");
    return {
      error: "Could not finish this review. Refresh the queue and try again.",
    };
  }
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  revalidatePath("/billing");
  revalidatePath("/settings");
  return { error: null };
}
