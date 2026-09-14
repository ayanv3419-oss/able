"use client";

import { useActionState } from "react";
import {
  deleteContextFolderAction,
  renameContextFolderAction,
} from "@/app/context/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContextFolder } from "@/lib/db/schema";

export function ContextFolderSettings({
  folder,
  materialCount,
}: {
  folder: ContextFolder;
  materialCount: number;
}) {
  const [renameState, renameAction, renaming] = useActionState(
    renameContextFolderAction,
    null
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteContextFolderAction,
    null
  );

  return (
    <details className="group rounded-xl border px-4 py-3">
      <summary className="cursor-pointer font-medium text-sm">
        Folder settings
      </summary>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <form action={renameAction} className="flex flex-col gap-2">
          <input name="id" type="hidden" value={folder.id} />
          <Label htmlFor="context-folder-name">Rename folder</Label>
          <Input
            defaultValue={folder.name}
            id="context-folder-name"
            maxLength={60}
            name="name"
            required
          />
          {renameState?.success === false ? (
            <p className="text-destructive text-xs">{renameState.error}</p>
          ) : null}
          {renameState?.success ? (
            <p className="text-emerald-600 text-xs">Renamed.</p>
          ) : null}
          <Button
            className="self-start"
            disabled={renaming}
            type="submit"
            variant="secondary"
          >
            {renaming ? "Saving…" : "Save name"}
          </Button>
        </form>
        <form action={deleteAction} className="flex flex-col gap-2">
          <input name="id" type="hidden" value={folder.id} />
          <Label>Delete folder</Label>
          <p className="text-muted-foreground text-sm">
            Only an empty folder can be deleted.
          </p>
          {deleteState?.success === false ? (
            <p className="text-destructive text-xs">{deleteState.error}</p>
          ) : null}
          <Button
            className="self-start"
            disabled={deleting || materialCount > 0}
            type="submit"
            variant="destructive"
          >
            {deleting ? "Deleting…" : "Delete empty folder"}
          </Button>
        </form>
      </div>
    </details>
  );
}
