"use client";

import { TrashIcon } from "lucide-react";
import { memo, useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteAllMemoriesAction,
  deleteMemoryAction,
} from "@/app/settings/actions";
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
import type { Memory } from "@/lib/db/schema";

type MemoryRow = Memory & { projectName?: string | null };

const PureMemoryItem = ({
  isPending,
  memory,
  onDelete,
}: {
  memory: MemoryRow;
  isPending: boolean;
  onDelete: (id: string) => void;
}) => {
  const handleClick = useCallback(() => {
    onDelete(memory.id);
  }, [memory.id, onDelete]);

  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2">
      <div className="flex flex-col gap-1">
        {memory.projectName ? (
          <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
            Project: {memory.projectName}
          </span>
        ) : null}
        <p className="text-sm">{memory.content}</p>
      </div>
      <Button
        className="shrink-0"
        disabled={isPending}
        onClick={handleClick}
        size="icon-xs"
        variant="ghost"
      >
        <TrashIcon className="size-3.5" />
        <span className="sr-only">Delete</span>
      </Button>
    </li>
  );
};

const MemoryItem = memo(PureMemoryItem);

/** The memory list with per-item delete and delete-all (SPEC §7 Settings, b). */
export function MemoryList({
  initialMemories,
}: {
  initialMemories: MemoryRow[];
}) {
  const [memories, setMemories] = useState(initialMemories);
  const [isPending, startTransition] = useTransition();

  const handleDelete = useCallback((id: string) => {
    startTransition(async () => {
      try {
        await deleteMemoryAction(id);
        setMemories((prev) => prev.filter((item) => item.id !== id));
      } catch {
        toast.error("Couldn't delete that memory. Please try again.");
      }
    });
  }, []);

  const handleDeleteAll = useCallback(() => {
    startTransition(async () => {
      try {
        await deleteAllMemoriesAction();
        setMemories([]);
        toast.success("All memories deleted");
      } catch {
        toast.error("Couldn't delete your memories. Please try again.");
      }
    });
  }, []);

  if (memories.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Able hasn't saved anything yet. Ask it to remember something and it will
        show up here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {memories.map((item) => (
          <MemoryItem
            isPending={isPending}
            key={item.id}
            memory={item}
            onDelete={handleDelete}
          />
        ))}
      </ul>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button className="self-start" size="sm" variant="outline">
            Delete all
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all memories?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes everything Able has remembered about you. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleDeleteAll}>
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
