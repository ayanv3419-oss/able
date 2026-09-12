"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/admin/admin-auth";
import { resolveRefundRequest } from "@/lib/db/billing-queries";
import { ChatbotError } from "@/lib/errors";

function requireRequestId(formData: FormData): string {
  const requestId = formData.get("requestId");

  if (typeof requestId !== "string" || requestId.length === 0) {
    throw new ChatbotError("bad_request:api", "Missing refund request id.");
  }

  return requestId;
}

/**
 * Marks a refund request refunded. This only records that the admin already
 * sent the money by hand over UPI outside this app — it has no way to move
 * money itself, per docs/SPEC.md §7.
 */
export async function markRefundedAction(formData: FormData) {
  const { email } = await requireAdmin();
  const requestId = requireRequestId(formData);

  await resolveRefundRequest({
    requestId,
    resolution: "refunded",
    resolver: email,
  });

  revalidatePath("/admin/refunds");
}

export async function declineRefundAction(formData: FormData) {
  const { email } = await requireAdmin();
  const requestId = requireRequestId(formData);

  await resolveRefundRequest({
    requestId,
    resolution: "declined",
    resolver: email,
  });

  revalidatePath("/admin/refunds");
}
