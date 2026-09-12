import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const legalPages = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
  { href: "/contact", label: "Contact" },
];

export default function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-border/60 border-b">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center px-5">
          <Link
            className="rounded-md transition-opacity hover:opacity-80"
            href="/"
          >
            <Logo size={26} />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
        <article className="prose prose-neutral max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-a:font-normal prose-a:underline-offset-4 prose-h1:text-3xl prose-h2:text-xl">
          {children}
        </article>
      </main>

      <footer className="border-border/60 border-t">
        <nav
          aria-label="Legal pages"
          className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-6 text-muted-foreground text-sm"
        >
          {legalPages.map((page) => (
            <Link
              className="transition-colors hover:text-foreground"
              href={page.href}
              key={page.href}
            >
              {page.label}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  );
}
