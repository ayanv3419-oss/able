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

/**
 * The "…" menu with rename and delete. It sits on a project's page and on
 * each folder in the Projects grid.
 */
export function ProjectActions({
  label = "Project options",
  project,
  triggerClassName,
  variant = "outline",
}: {
  /** The button's accessible name. Each grid folder names its project. */
  label?: string;
  project: Project;
  triggerClassName?: string;
  variant?: "ghost" | "outline";
}) {
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
            aria-label={label}
            className={triggerClassName}
            disabled={!hydrated}
            size="icon"
            variant={variant}
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
