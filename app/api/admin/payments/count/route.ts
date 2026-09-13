import { requireAdmin } from "@/app/admin/admin-auth";
import { countPendingPayments } from "@/lib/db/billing-queries";
import { ChatbotError } from "@/lib/errors";

export async function GET() {
  try {
    await requireAdmin();
    return Response.json(
      { count: await countPendingPayments() },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    throw error;
  }
}
