"use client";

import { useActionState, useCallback, useEffect, useId } from "react";
import { mutate } from "swr";
import { renameProjectAction } from "@/app/project/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Project } from "@/lib/db/schema";
import { PROJECTS_SWR_KEY } from "./use-projects-list";

/**
 * Mounted only while a project is being renamed (see ProjectActions), so each
 * instance starts fresh for its target project.
 */
export function RenameProjectDialog({
  onClose,
  project,
}: {
  project: Project;
  onClose: () => void;
}) {
  const nameId = useId();
  const [state, formAction, isPending] = useActionState(
    renameProjectAction,
    null
  );

  useEffect(() => {
    if (state?.success) {
      mutate(PROJECTS_SWR_KEY);
      onClose();
    }
  }, [state, onClose]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <Dialog onOpenChange={handleOpenChange} open>
      <DialogContent>
        <form action={formAction}>
          <input name="id" type="hidden" value={project.id} />
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Label htmlFor={nameId}>Name</Label>
            <Input
              autoFocus
              defaultValue={project.name}
              id={nameId}
              maxLength={60}
              name="name"
              required
            />
            {state?.success === false ? (
              <p className="text-destructive text-sm">{state.error}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
