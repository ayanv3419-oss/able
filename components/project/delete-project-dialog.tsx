"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { deleteProjectAction } from "@/app/project/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Project } from "@/lib/db/schema";
import { PROJECTS_SWR_KEY } from "./use-projects-list";

/**
 * Mounted only while a project is pending deletion (see ProjectsNav). Its
 * chats are kept and simply moved out of the project, per docs/SPEC.md §2.
 */
export function DeleteProjectDialog({
  onClose,
  project,
}: {
  project: Project;
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleDelete = useCallback(() => {
    startTransition(async () => {
      try {
        await deleteProjectAction(project.id);
        mutate(PROJECTS_SWR_KEY);
        if (
          pathname === `/project/${project.id}` ||
          pathname.startsWith(`/project/${project.id}/`)
        ) {
          router.replace("/projects");
        } else {
          router.refresh();
        }
        toast.success("Project deleted");
      } catch {
        toast.error("Couldn't delete that project. Please try again.");
      } finally {
        onClose();
      }
    });
  }, [onClose, pathname, project.id, router]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <AlertDialog onOpenChange={handleOpenChange} open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{project.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Its chats are kept and moved out of the project. Memories saved for
            this project are deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleDelete}>
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
