"use client";

import { useFormStatus } from "react-dom";

import { LoaderIcon } from "@/components/chat/icons";
import { cn } from "@/lib/utils";

import { Button } from "../ui/button";

export function SubmitButton({
  children,
  className,
  isSuccessful,
}: {
  children: React.ReactNode;
  /** Extra classes, for example to invert the button on a dark card. */
  className?: string;
  isSuccessful: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-disabled={pending || isSuccessful}
      className={cn("relative", className)}
      disabled={pending || isSuccessful}
      type={pending ? "button" : "submit"}
    >
      {children}

      {pending || isSuccessful ? (
        <span className="absolute right-4 animate-spin">
          <LoaderIcon />
        </span>
      ) : null}

      <output aria-live="polite" className="sr-only">
        {pending || isSuccessful ? "Loading" : "Submit form"}
      </output>
    </Button>
  );
}
