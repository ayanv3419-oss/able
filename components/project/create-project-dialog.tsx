"use client";

import { FolderPlusIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useId, useState } from "react";
import { mutate } from "swr";
import { createProjectAction } from "@/app/project/actions";
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
import { PROJECTS_SWR_KEY } from "./use-projects-list";

export function CreateProjectDialog({ compact = true }: { compact?: boolean }) {
  const nameId = useId();
  // A click before hydration would be lost, so wait for the handlers.
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createProjectAction,
    null
  );

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
      mutate(PROJECTS_SWR_KEY);
    }
  }, [state]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          className={
            compact
              ? "h-7 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground"
              : undefined
          }
          disabled={!hydrated}
          size={compact ? "icon-xs" : "default"}
          type="button"
          variant={compact ? "ghost" : "default"}
        >
          <FolderPlusIcon className="size-3.5" />
          <span className={compact ? "sr-only" : undefined}>New project</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Projects keep related chats and instructions together.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Label htmlFor={nameId}>Name</Label>
            <Input
              autoFocus
              id={nameId}
              maxLength={60}
              name="name"
              placeholder="e.g. Biology 101"
              required
            />
            {state?.success === false ? (
              <p className="text-destructive text-sm">
                {state.error}
                {state.upgrade ? (
                  <>
                    {" "}
                    <Link className="underline" href="/pricing">
                      See plans
                    </Link>
                    .
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button disabled={isPending} type="submit">
              {isPending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
