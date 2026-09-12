import { auth } from "@/app/(auth)/auth";
import { isAdminEmail } from "@/lib/admin";
import { ChatbotError } from "@/lib/errors";

export type AdminSession = { email: string };

/**
 * Re-checks admin access inside a Server Action. `app/admin/layout.tsx`
 * already keeps a non-admin away from every page under /admin, but a Server
 * Action can be invoked directly without rendering the page first, so every
 * action in this section calls this again instead of trusting the layout.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await auth();
  const email = session?.user?.email;

  if (!email || !isAdminEmail(email)) {
    throw new ChatbotError("forbidden:auth");
  }

  return { email };
}
