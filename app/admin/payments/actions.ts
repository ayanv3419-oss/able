"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/admin/admin-auth";
import { approvePayment, rejectPayment } from "@/lib/db/billing-queries";
import { ChatbotError } from "@/lib/errors";

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

  await approvePayment({ now: new Date(), paymentId, reviewer: email });

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

  await rejectPayment({ paymentId, reviewer: email, reviewNote: note });

  revalidatePath("/admin/payments");
  revalidatePath("/admin");
}
