"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/admin/admin-auth";
import {
  extendSubscription,
  revokeSubscription,
} from "@/lib/db/billing-queries";
import { ChatbotError } from "@/lib/errors";

const MAX_EXTEND_DAYS = 365;

function requireSubscriptionId(formData: FormData): string {
  const subscriptionId = formData.get("subscriptionId");

  if (typeof subscriptionId !== "string" || subscriptionId.length === 0) {
    throw new ChatbotError("bad_request:api", "Missing subscription id.");
  }

  return subscriptionId;
}

export async function revokeSubscriptionAction(formData: FormData) {
  const { email } = await requireAdmin();
  const subscriptionId = requireSubscriptionId(formData);

  await revokeSubscription({ reviewer: email, subscriptionId });

  revalidatePath("/admin/subscriptions");
}

export async function extendSubscriptionAction(formData: FormData) {
  await requireAdmin();
  const subscriptionId = requireSubscriptionId(formData);
  const days = Number(formData.get("days"));

  if (!Number.isInteger(days) || days <= 0 || days > MAX_EXTEND_DAYS) {
    throw new ChatbotError(
      "bad_request:api",
      `Enter a whole number of days between 1 and ${MAX_EXTEND_DAYS}.`
    );
  }

  await extendSubscription({ days, subscriptionId });

  revalidatePath("/admin/subscriptions");
}
