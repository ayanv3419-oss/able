"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/admin/admin-auth";
import { getUserById } from "@/lib/db/account-queries";
import { approvePayment, rejectPayment } from "@/lib/db/billing-queries";
import { sendPaymentReviewEmail } from "@/lib/email";
import { ChatbotError } from "@/lib/errors";
import { getPlan } from "@/lib/plans";

function requirePaymentId(formData: FormData): string {
  const paymentId = formData.get("paymentId");

  if (typeof paymentId !== "string" || paymentId.length === 0) {
    throw new ChatbotError("bad_request:api", "Missing payment id.");
  }

  return paymentId;
}

export async function approvePaymentAction(formData: FormData) {
  const { email } = await requireAdmin();
  const paymentId = requirePaymentId(formData);

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

  revalidatePath("/admin/payments");
  revalidatePath("/admin");
}

export async function rejectPaymentAction(formData: FormData) {
  const { email } = await requireAdmin();
  const paymentId = requirePaymentId(formData);
  const reviewNote = formData.get("reviewNote");
  const note = typeof reviewNote === "string" ? reviewNote.trim() : "";

  if (note.length === 0) {
    throw new ChatbotError(
      "bad_request:api",
      "A reason is required to reject a payment."
    );
  }

  const payment = await rejectPayment({
    paymentId,
    reviewer: email,
    reviewNote: note,
  });
  const student = payment.userId ? await getUserById(payment.userId) : null;
  if (student) {
    await sendPaymentReviewEmail({
      approved: false,
      note,
      planName: getPlan(payment.planId).name,
      to: student.email,
    });
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin");
}
