"use client";

import { useActionState, useId } from "react";
import { deleteAccountAction } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONFIRMATION_WORD = "DELETE";

/** Delete account (SPEC §7 Settings, e): confirm-typed-text, then sign out. */
export function DeleteAccountDialog() {
  const confirmId = useId();
  const [state, formAction, isPending] = useActionState(
    deleteAccountAction,
    null
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete account</Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently removes your chats, messages, projects, memories,
              settings and usage history. Payment records are kept for
              accounting, with your name removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Label htmlFor={confirmId}>
              Type {CONFIRMATION_WORD} to confirm
            </Label>
            <Input
              autoComplete="off"
              id={confirmId}
              name="confirmation"
              placeholder={CONFIRMATION_WORD}
              required
            />
            {state?.success === false ? (
              <p className="text-destructive text-sm">{state.error}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button disabled={isPending} type="submit" variant="destructive">
              {isPending ? "Deleting…" : "Delete my account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
