import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { createPayment } from "@/lib/db/billing-queries";
import { ChatbotError } from "@/lib/errors";
import { getPlan, isPlanId } from "@/lib/plans";

const bodySchema = z.object({
  planId: z.string(),
});

/**
 * Records a student's request after they pay by UPI, per docs/SPEC.md §7 Pay.
 * The owner allows or rejects it by hand on the admin page; this route only
 * resolves the plan's rupee amount and stores a pending request.
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
      "planId is required."
    ).toResponse();
  }

  if (!isPlanId(body.planId)) {
    return new ChatbotError("bad_request:api", "Unknown plan.").toResponse();
  }

  const plan = getPlan(body.planId);

  try {
    const created = await createPayment({
      amountInr: plan.priceInr,
      planId: plan.id,
      userId: session.user.id,
    });

    return Response.json({ payment: created }, { status: 201 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    throw error;
  }
}
