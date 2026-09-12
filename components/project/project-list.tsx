"use client";

import {
  FolderIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { memo, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { Project } from "@/lib/db/schema";

const PureProjectRow = ({
  isActive,
  onDelete,
  onRename,
  onSelect,
  project,
}: {
  project: Project;
  isActive: boolean;
  onRename: (project: Project) => void;
  onDelete: (project: Project) => void;
  onSelect: () => void;
}) => {
  const handleRename = useCallback(
    (event: Event) => {
      event.preventDefault();
      onRename(project);
    },
    [onRename, project]
  );

  const handleDelete = useCallback(
    (event: Event) => {
      event.preventDefault();
      onDelete(project);
    },
    [onDelete, project]
  );

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className="h-8 rounded-lg text-[13px] text-sidebar-foreground/70 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground"
        isActive={isActive}
      >
        <Link href={`/project/${project.id}`} onClick={onSelect}>
          <FolderIcon className="size-4" />
          <span className="truncate">{project.name}</span>
        </Link>
      </SidebarMenuButton>

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            className="mr-0.5 rounded-md text-sidebar-foreground/50 ring-0 transition-colors duration-150 focus-visible:ring-0 hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            showOnHover
          >
            <MoreHorizontalIcon />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem onSelect={handleRename}>
            <PencilIcon />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDelete} variant="destructive">
            <TrashIcon />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

const ProjectRow = memo(PureProjectRow);

/** The sidebar's list of project folders, each with a rename/delete menu. */
export function ProjectList({
  activeProjectId,
  onDelete,
  onRename,
  onSelect,
  projects,
}: {
  projects: Project[];
  activeProjectId: string | null;
  onRename: (project: Project) => void;
  onDelete: (project: Project) => void;
  onSelect: () => void;
}) {
  return (
    <SidebarMenu>
      {projects.map((project) => (
        <ProjectRow
          isActive={project.id === activeProjectId}
          key={project.id}
          onDelete={onDelete}
          onRename={onRename}
          onSelect={onSelect}
          project={project}
        />
      ))}
    </SidebarMenu>
  );
}
