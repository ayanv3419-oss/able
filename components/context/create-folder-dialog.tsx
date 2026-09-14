"use client";

import { FolderPlusIcon } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";
import { createContextFolderAction } from "@/app/context/actions";
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
import { useHydrated } from "@/hooks/use-hydrated";

export function CreateContextFolderDialog() {
  const hydrated = useHydrated();
  const nameId = useId();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    createContextFolderAction,
    null
  );

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button disabled={!hydrated} type="button">
          <FolderPlusIcon /> New subject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={action}>
          <DialogHeader>
            <DialogTitle>New subject folder</DialogTitle>
            <DialogDescription>
              Group study material for one subject or course.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Label htmlFor={nameId}>Folder name</Label>
            <Input
              autoFocus
              id={nameId}
              maxLength={60}
              name="name"
              placeholder="e.g. Class 12 Physics"
              required
            />
            {state?.success === false ? (
              <p className="text-destructive text-sm">{state.error}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button disabled={pending} type="submit">
              {pending ? "Creating…" : "Create folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
