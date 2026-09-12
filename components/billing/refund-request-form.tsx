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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/hooks/use-hydrated";

type RefundErrorBody = { message?: string };

/**
 * The refund form on `/billing`, per docs/SPEC.md §7 Refund. Posts to
 * `POST /api/refund-requests`, which enforces the 7-day window and the
 * one-request-per-payment rule server-side.
 */
export function RefundRequestForm({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleReasonChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setReason(event.target.value);
    },
    []
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (reason.trim().length === 0) {
        setError("Tell us why you'd like a refund.");
        return;
      }

      setError(null);

      startTransition(async () => {
        try {
          const response = await fetch("/api/refund-requests", {
            body: JSON.stringify({ paymentId, reason: reason.trim() }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          });

          if (!response.ok) {
            const body: RefundErrorBody = await response
              .json()
              .catch(() => ({}));
            setError(body.message ?? "Something went wrong. Please try again.");
            return;
          }

          setDone(true);
          router.refresh();
        } catch {
          setError("Could not connect. Please try sending your request again.");
        }
      });
    },
    [paymentId, reason, router]
  );

  if (done) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        Refund requested. Awaiting review. This page will update once the owner
        resolves your request.
      </p>
    );
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`refund-reason-${paymentId}`}>
          Reason for the refund
        </Label>
        <Textarea
          disabled={!hydrated}
          id={`refund-reason-${paymentId}`}
          maxLength={2000}
          onChange={handleReasonChange}
          placeholder="Tell us what went wrong"
          value={reason}
        />
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button disabled={!hydrated || isPending} type="submit" variant="outline">
        {isPending ? "Sending…" : "Request a refund"}
      </Button>
    </form>
  );
}
