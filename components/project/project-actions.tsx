"use client";

import { MoreHorizontalIcon, PencilIcon, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHydrated } from "@/hooks/use-hydrated";
import type { Project } from "@/lib/db/schema";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { RenameProjectDialog } from "./rename-project-dialog";

/** The project page's "…" menu with rename and delete. */
export function ProjectActions({ project }: { project: Project }) {
  // Clicks made before hydration would be lost, so wait for the handlers.
  const hydrated = useHydrated();
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const openRename = useCallback(() => setDialog("rename"), []);
  const openDelete = useCallback(() => setDialog("delete"), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  return (
    <>
      {/* Non-modal, so closing the menu can't leave the page locked when a dialog opens from it. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Project options"
            disabled={!hydrated}
            size="icon"
            variant="outline"
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={openRename}>
            <PencilIcon />
            Rename project
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openDelete} variant="destructive">
            <TrashIcon />
            Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog === "rename" ? (
        <RenameProjectDialog onClose={closeDialog} project={project} />
      ) : null}
      {dialog === "delete" ? (
        <DeleteProjectDialog onClose={closeDialog} project={project} />
      ) : null}
    </>
  );
}
