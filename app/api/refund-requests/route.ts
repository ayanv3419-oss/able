import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { createRefundRequest } from "@/lib/db/billing-queries";
import { ChatbotError } from "@/lib/errors";

const MAX_REASON_LENGTH = 2000;

const bodySchema = z.object({
  paymentId: z.uuid(),
  reason: z.string().trim().min(1).max(MAX_REASON_LENGTH),
});

/**
 * Asks for a refund, per docs/SPEC.md §7 Refund. `createRefundRequest`
 * enforces the 7-day window and the one-request-per-payment rule; this route
 * only authenticates the student and forwards their reason.
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
      "paymentId and reason are required."
    ).toResponse();
  }

  try {
    const created = await createRefundRequest({
      now: new Date(),
      paymentId: body.paymentId,
      reason: body.reason.trim(),
      userId: session.user.id,
    });

    return Response.json({ refundRequest: created }, { status: 201 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    throw error;
  }
}
