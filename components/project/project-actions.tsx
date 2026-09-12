"use client";

import { PencilIcon, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import type { Project } from "@/lib/db/schema";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { RenameProjectDialog } from "./rename-project-dialog";

export function ProjectActions({ project }: { project: Project }) {
  // Clicks made before hydration would be lost, so wait for the handlers.
  const hydrated = useHydrated();
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const openRename = useCallback(() => setDialog("rename"), []);
  const openDelete = useCallback(() => setDialog("delete"), []);
  const closeDialog = useCallback(() => setDialog(null), []);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!hydrated}
          onClick={openRename}
          size="sm"
          variant="outline"
        >
          <PencilIcon />
          Rename project
        </Button>
        <Button
          disabled={!hydrated}
          onClick={openDelete}
          size="sm"
          variant="ghost"
        >
          <TrashIcon />
          Delete project
        </Button>
      </div>
      {dialog === "rename" ? (
        <RenameProjectDialog onClose={closeDialog} project={project} />
      ) : null}
      {dialog === "delete" ? (
        <DeleteProjectDialog onClose={closeDialog} project={project} />
      ) : null}
    </>
  );
}
