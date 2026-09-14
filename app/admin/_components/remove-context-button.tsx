"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { removeStudyContextBySupportAction } from "@/app/admin/users/context-actions";
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

export function RemoveContextButton({
  materialId,
  userId,
}: {
  materialId: string;
  userId: string;
}) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const remove = useCallback(() => {
    startTransition(async () => {
      await removeStudyContextBySupportAction({ materialId, userId });
      setOpen(false);
      router.refresh();
    });
  }, [materialId, router, userId]);

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger asChild>
        <Button
          disabled={!hydrated || pending}
          size="xs"
          type="button"
          variant="destructive"
        >
          Remove
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this Context?</AlertDialogTitle>
          <AlertDialogDescription>
            Do this only at the student's request. The saved material is
            permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={remove}>
            {pending ? "Removing…" : "Remove permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
