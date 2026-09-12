"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export default function ProjectError({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-5 py-20"
      role="alert"
    >
      <h1 className="font-semibold text-xl">Couldn't load projects</h1>
      <p className="text-muted-foreground text-sm">
        Please try again to load your project and its conversations.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={pending} onClick={retry} type="button">
          {pending ? "Trying again…" : "Try again"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/projects">Back to projects</Link>
        </Button>
      </div>
    </div>
  );
}
