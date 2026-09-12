import { auth } from "@/app/(auth)/auth";
import { getEntitlement } from "@/lib/entitlements";
import { ChatbotError } from "@/lib/errors";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }
  return Response.json(await getEntitlement(session.user.id), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
