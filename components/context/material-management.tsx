"use client";

import { useActionState } from "react";
import {
  deleteStudyContextAction,
  moveStudyContextAction,
} from "@/app/context/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContextFolder } from "@/lib/db/schema";

export function MaterialManagement({
  canEdit,
  currentFolderId,
  folders,
  materialId,
}: {
  canEdit: boolean;
  currentFolderId: string;
  folders: ContextFolder[];
  materialId: string;
}) {
  const [moveState, moveAction, moving] = useActionState(
    moveStudyContextAction,
    null
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteStudyContextAction,
    null
  );

  return (
    <div className="grid gap-6 rounded-xl border p-4 sm:grid-cols-2">
      <form action={moveAction} className="flex flex-col gap-2">
        <input name="id" type="hidden" value={materialId} />
        <Label htmlFor="move-context-folder">Move to folder</Label>
        <Select defaultValue={currentFolderId} name="folderId">
          <SelectTrigger id="move-context-folder">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {folders.map((folder) => (
              <SelectItem key={folder.id} value={folder.id}>
                {folder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {moveState?.success === false ? (
          <p className="text-destructive text-xs">{moveState.error}</p>
        ) : null}
        <Button
          className="self-start"
          disabled={moving}
          type="submit"
          variant="secondary"
        >
          {moving ? "Moving…" : "Move"}
        </Button>
      </form>
      <form action={deleteAction} className="flex flex-col gap-2">
        <input name="id" type="hidden" value={materialId} />
        <Label>Remove Context</Label>
        <p className="text-muted-foreground text-sm">
          {canEdit
            ? "Removal is available during the 10-minute window."
            : "This Context is permanently locked. Support can remove it on request."}
        </p>
        {deleteState?.success === false ? (
          <p className="text-destructive text-xs">{deleteState.error}</p>
        ) : null}
        <Button
          className="self-start"
          disabled={!canEdit || deleting}
          type="submit"
          variant="destructive"
        >
          {deleting ? "Removing…" : "Remove Context"}
        </Button>
      </form>
    </div>
  );
}
