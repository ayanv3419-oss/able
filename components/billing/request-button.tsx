"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import type { PlanId } from "@/lib/plans";

type PaymentErrorBody = { code?: string; message?: string };

/**
 * Sends the owner a request for this plan after the student has paid by UPI.
 * The owner checks the payment in their UPI app, then allows or rejects it.
 */
export function RequestButton({ planId }: { planId: PlanId }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRequest = useCallback(() => {
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/payments", {
          body: JSON.stringify({ planId }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        if (!response.ok) {
          const body: PaymentErrorBody = await response
            .json()
            .catch(() => ({}));

          if (body.code === "forbidden:account") {
            router.push("/blocked");
            return;
          }

          if (body.code === "forbidden:payment") {
            router.push("/waiting");
            return;
          }

          setError(body.message ?? "Something went wrong. Please try again.");
          return;
        }

        router.push("/waiting");
        router.refresh();
      } catch {
        setError("Could not connect. Please try again.");
      }
    });
  }, [planId, router]);

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        disabled={!hydrated || isPending}
        onClick={handleRequest}
        type="button"
      >
        {isPending ? "Sending…" : "I've paid — send request"}
      </Button>
    </div>
  );
}
