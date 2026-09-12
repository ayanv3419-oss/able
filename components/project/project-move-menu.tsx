"use client";

import { FolderIcon } from "lucide-react";
import { memo, useCallback, useTransition } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { moveChatToProjectAction } from "@/app/project/actions";
import { CheckCircleFillIcon } from "@/components/chat/icons";
import { getChatHistoryPaginationKey } from "@/components/chat/sidebar-history";
import {
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project } from "@/lib/db/schema";
import { useProjectsList } from "./use-projects-list";

const PureMoveToProjectItem = ({
  isCurrent,
  isPending,
  move,
  project,
}: {
  project: Project;
  isCurrent: boolean;
  isPending: boolean;
  move: (projectId: string | null) => void;
}) => {
  const handleSelect = useCallback(() => {
    move(project.id);
  }, [move, project.id]);

  return (
    <DropdownMenuItem
      className="cursor-pointer flex-row justify-between"
      disabled={isPending}
      onSelect={handleSelect}
    >
      <span className="truncate">{project.name}</span>
      {isCurrent ? <CheckCircleFillIcon /> : null}
    </DropdownMenuItem>
  );
};

const MoveToProjectItem = memo(PureMoveToProjectItem);

/**
 * "Move to project" submenu plus a "Remove from project" item, added to a
 * chat row's existing dropdown (see components/chat/sidebar-history-item.tsx).
 */
export function ProjectMoveMenu({
  chatId,
  currentProjectId,
}: {
  chatId: string;
  currentProjectId: string | null;
}) {
  const { data: projects } = useProjectsList(true);
  const { mutate } = useSWRConfig();
  const [isPending, startTransition] = useTransition();

  const move = useCallback(
    (projectId: string | null) => {
      startTransition(async () => {
        try {
          await moveChatToProjectAction({ chatId, projectId });
          await mutate(unstable_serialize(getChatHistoryPaginationKey));
          toast.success(
            projectId ? "Chat moved to project" : "Chat removed from project"
          );
        } catch {
          toast.error("Couldn't update the chat's project. Please try again.");
        }
      });
    },
    [chatId, mutate]
  );

  const handleRemove = useCallback(() => {
    move(null);
  }, [move]);

  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="cursor-pointer">
          <FolderIcon className="size-4" />
          <span>Move to project</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent>
            {projects.map((project) => (
              <MoveToProjectItem
                isCurrent={project.id === currentProjectId}
                isPending={isPending}
                key={project.id}
                move={move}
                project={project}
              />
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
      {currentProjectId ? (
        <DropdownMenuItem disabled={isPending} onSelect={handleRemove}>
          <span>Remove from project</span>
        </DropdownMenuItem>
      ) : null}
    </>
  );
}
