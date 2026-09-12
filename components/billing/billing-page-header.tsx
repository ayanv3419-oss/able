import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/**
 * Minimal chrome for the billing-area pages (`/pricing`, `/pay/[plan]`,
 * `/billing`), which sit outside the chat layout and so get no sidebar.
 */
export function BillingPageHeader() {
  return (
    <header className="border-border/60 border-b">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center px-5">
        <Link
          className="rounded-md transition-opacity hover:opacity-80"
          href="/"
        >
          <Logo size={26} />
        </Link>
      </div>
    </header>
  );
}
