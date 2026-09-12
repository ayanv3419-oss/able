import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SubmitButton } from "@/components/chat/submit-button";
import { isLocalPreview } from "@/lib/constants";
import { signInWithGoogle } from "../actions";

const legalLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
  { href: "/contact", label: "Contact" },
];

type SearchParams = Record<string, string | string[] | undefined>;

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function SignInForm({
  callbackUrl = "/",
  hasError = false,
}: {
  callbackUrl?: string;
  hasError?: boolean;
}) {
  return (
    <form action={signInWithGoogle} className="flex w-full flex-col gap-3">
      <input name="callbackUrl" type="hidden" value={callbackUrl} />
      <SubmitButton isSuccessful={false}>
        <GoogleIcon />
        Continue with Google
      </SubmitButton>
      {hasError ? (
        <p className="text-center text-destructive text-xs" role="alert">
          That sign-in did not go through. Please try again.
        </p>
      ) : null}
    </form>
  );
}

async function SignInFormForRequest({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { callbackUrl, error } = await searchParams;

  return (
    <SignInForm
      callbackUrl={typeof callbackUrl === "string" ? callbackUrl : "/"}
      hasError={Boolean(error)}
    />
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (isLocalPreview) {
    redirect("/");
  }

  return (
    <main className="flex w-full max-w-sm flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-semibold text-3xl tracking-tight">Able</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to pick up where you left off.
        </p>
      </div>

      <Suspense fallback={<SignInForm />}>
        <SignInFormForRequest searchParams={searchParams} />
      </Suspense>

      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-muted-foreground/70 text-xs">
        {legalLinks.map((link) => (
          <Link
            className="transition-colors hover:text-foreground hover:underline"
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
