"use client";

import { useActionState, useCallback, useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const formRef = useRef<HTMLFormElement>(null);
  const rejectRef = useRef<HTMLButtonElement>(null);
  // Rejecting blocks the student, so it is confirmed in a dialog first. The
  // dialog renders outside the form, so it submits through a hidden button.
  const confirmReject = useCallback(() => {
    formRef.current?.requestSubmit(rejectRef.current);
  }, []);

  return (
    <form
      action={action}
      className="flex min-w-48 flex-col gap-2"
      ref={formRef}
    >
      <input name="paymentId" type="hidden" value={paymentId} />
      <div className="flex gap-2">
        <Button
          className="min-h-11 flex-1"
          disabled={!hydrated || pending || !canApprove}
          name="decision"
          type="submit"
          value="approve"
        >
          Allow
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="min-h-11 flex-1"
              disabled={!hydrated || pending}
              type="button"
              variant="destructive"
            >
              Reject
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject this request?</AlertDialogTitle>
              <AlertDialogDescription>
                The student will be blocked until you unblock them.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction onClick={confirmReject}>
                Reject and block
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <button
        aria-hidden
        className="hidden"
        name="decision"
        ref={rejectRef}
        tabIndex={-1}
        type="submit"
        value="reject"
      />
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
