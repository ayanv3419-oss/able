import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-border/60 border-b">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-5">
          <Link
            className="rounded-md transition-opacity hover:opacity-80"
            href="/"
          >
            <Logo size={26} />
          </Link>
          <Link
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            href="/"
          >
            Back to chat
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
