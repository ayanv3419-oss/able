"use client";

import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHydrated } from "@/hooks/use-hydrated";
import { normalizeUtr } from "@/lib/billing/rules";
import type { PlanId } from "@/lib/plans";

type PaymentErrorBody = { message?: string };

/**
 * Submits the UPI reference number for a pending payment. Validates with
 * `normalizeUtr` as the student types for instant feedback, then re-validates
 * and submits through `POST /api/payments`, which is the source of truth.
 */
export function UtrForm({ planId }: { planId: PlanId }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [utr, setUtr] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleUtrChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setUtr(value);
      setFormError(null);

      if (value.trim().length === 0) {
        setFieldError(null);
        return;
      }

      const result = normalizeUtr(value);
      setFieldError(result.ok ? null : result.error);
    },
    []
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const result = normalizeUtr(utr);

      if (!result.ok) {
        setFieldError(result.error);
        return;
      }

      setFormError(null);

      startTransition(async () => {
        try {
          const response = await fetch("/api/payments", {
            body: JSON.stringify({
              planId,
              utr: result.utr,
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          });

          if (!response.ok) {
            const body: PaymentErrorBody = await response
              .json()
              .catch(() => ({}));
            setFormError(
              body.message ?? "Something went wrong. Please try again."
            );
            return;
          }

          router.push("/billing");
          router.refresh();
        } catch {
          setFormError(
            "Could not connect. Your reference is still here; please try again."
          );
        }
      });
    },
    [planId, utr, router]
  );

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="utr">UPI reference number (UTR)</Label>
        <Input
          aria-invalid={fieldError ? true : undefined}
          autoComplete="off"
          disabled={!hydrated}
          id="utr"
          onChange={handleUtrChange}
          placeholder="e.g. 401234567890"
          value={utr}
        />
        {fieldError ? (
          <p className="text-destructive text-xs" role="alert">
            {fieldError}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">
            Find this in your UPI app's payment history or SMS receipt. 10 to 24
            letters or digits.
          </p>
        )}
      </div>

      {formError ? (
        <p className="text-destructive text-sm" role="alert">
          {formError}
        </p>
      ) : null}

      <Button
        disabled={!hydrated || isPending || utr.trim().length === 0}
        type="submit"
      >
        {isPending ? "Submitting…" : "I've paid — submit reference number"}
      </Button>
    </form>
  );
}
