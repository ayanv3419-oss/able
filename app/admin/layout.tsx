import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "./_components/admin-shell";

export const metadata: Metadata = {
  title: "Admin",
};

/**
 * Stays synchronous so the dynamic admin check (reads the session cookie)
 * lives inside a Suspense boundary, per this app's cacheComponents setup —
 * the same pattern app/(chat)/layout.tsx uses around its own auth() call.
 */
export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
