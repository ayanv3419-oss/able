import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { normalizeUtr } from "@/lib/billing/rules";
import { createPayment } from "@/lib/db/billing-queries";
import { ChatbotError } from "@/lib/errors";
import { getPlan, isPlanId } from "@/lib/plans";

const bodySchema = z.object({
  planId: z.string(),
  utr: z.string(),
});

/**
 * Records a payment a student says they made, per docs/SPEC.md §7 Pay. The
 * owner reviews it by hand on the admin page; this route only validates the
 * UTR, resolves the plan's rupee amount, and stores a pending `Payment`.
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  let body: z.infer<typeof bodySchema>;

  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:api",
      "planId and utr are required."
    ).toResponse();
  }

  if (!isPlanId(body.planId)) {
    return new ChatbotError("bad_request:api", "Unknown plan.").toResponse();
  }

  const normalized = normalizeUtr(body.utr);

  if (!normalized.ok) {
    return new ChatbotError("bad_request:api", normalized.error).toResponse();
  }

  const plan = getPlan(body.planId);

  try {
    const created = await createPayment({
      amountInr: plan.priceInr,
      planId: plan.id,
      userId: session.user.id,
      utr: normalized.utr,
    });

    return Response.json({ payment: created }, { status: 201 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    throw error;
  }
}
