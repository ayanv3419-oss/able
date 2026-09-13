import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/app/(auth)/auth";
import { isAdminEmail } from "@/lib/admin";
import { AdminNav } from "./nav";

/**
 * Gates every page under /admin. A student who isn't an admin is sent to "/"
 * rather than "/login", so landing on /admin doesn't reveal that the page
 * exists. Every Server Action in this section re-checks independently via
 * requireAdmin() in app/admin/admin-auth.ts, since this layout check alone
 * doesn't protect an action invoked directly.
 */
export async function AdminShell({ children }: { children: ReactNode }) {
  const session = await auth();
  const email = session?.user?.email;

  if (!isAdminEmail(email)) {
    redirect("/");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-border/60 border-b">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="font-semibold">Able admin</span>
            <span className="wrap-anywhere text-muted-foreground text-xs">
              {email}
            </span>
          </div>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
        {children}
      </main>
    </div>
  );
}
