"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { reviewPaymentAction } from "./actions";

export function ReviewButtons({
  paymentId,
  canApprove,
}: {
  paymentId: string;
  canApprove: boolean;
}) {
  const [state, action, pending] = useActionState(reviewPaymentAction, {
    error: null,
  });
  const hydrated = useHydrated();
  return (
    <form action={action} className="flex min-w-48 flex-col gap-2">
      <input name="paymentId" type="hidden" value={paymentId} />
      <div className="flex gap-2">
        <Button
          className="min-h-11 flex-1"
          disabled={!hydrated || pending || !canApprove}
          name="decision"
          type="submit"
          value="approve"
        >
          Approve
        </Button>
        <Button
          className="min-h-11 flex-1"
          disabled={!hydrated || pending}
          name="decision"
          type="submit"
          value="reject"
          variant="destructive"
        >
          Reject
        </Button>
      </div>
      {pending ? (
        <p className="text-muted-foreground text-xs" role="status">
          Saving…
        </p>
      ) : null}
      {state.error ? (
        <p className="max-w-72 text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
