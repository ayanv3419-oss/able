import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export default function ContextLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background">
        <nav
          aria-label="Chat navigation"
          className="mx-auto flex w-full max-w-2xl px-5 py-3"
        >
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeftIcon aria-hidden="true" />
              Back to chat
            </Link>
          </Button>
        </nav>
      </header>
      {children}
    </>
  );
}
