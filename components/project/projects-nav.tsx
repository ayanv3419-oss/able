"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import type { Project } from "@/lib/db/schema";
import { CreateProjectDialog } from "./create-project-dialog";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { ProjectList } from "./project-list";
import { RenameProjectDialog } from "./rename-project-dialog";
import { useProjectsList } from "./use-projects-list";

/**
 * The sidebar's "Projects" section: folders, in their own group so this
 * insertion into app-sidebar.tsx stays additive. Renders nothing for a
 * signed-out visitor or a student with no projects yet, beyond the create
 * control, so it never crowds the chat history below it.
 */
export function ProjectsNav() {
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const activeProjectId = pathname?.startsWith("/project/")
    ? (pathname.split("/")[2] ?? null)
    : null;

  const { data: projects, isLoading } = useProjectsList(true);
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const closeMobile = useCallback(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);

  const closeRenameDialog = useCallback(() => {
    setRenameTarget(null);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-between pr-1">
          <SidebarGroupLabel
            asChild
            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70"
          >
            <Link href="/projects" onClick={closeMobile}>
              Projects
            </Link>
          </SidebarGroupLabel>
          <CreateProjectDialog />
        </div>
        <SidebarGroupContent>
          {isLoading ? (
            <div className="px-2 py-1 text-[13px] text-sidebar-foreground/50">
              Loading…
            </div>
          ) : null}
          {!isLoading && projects && projects.length > 0 ? (
            <ProjectList
              activeProjectId={activeProjectId}
              onDelete={setDeleteTarget}
              onRename={setRenameTarget}
              onSelect={closeMobile}
              projects={projects}
            />
          ) : null}
          {!isLoading && projects && projects.length === 0 ? (
            <div className="px-2 py-1 text-[13px] text-sidebar-foreground/50">
              No projects yet
            </div>
          ) : null}
        </SidebarGroupContent>
      </SidebarGroup>

      {renameTarget ? (
        <RenameProjectDialog
          key={renameTarget.id}
          onClose={closeRenameDialog}
          project={renameTarget}
        />
      ) : null}
      {deleteTarget ? (
        <DeleteProjectDialog
          key={deleteTarget.id}
          onClose={closeDeleteDialog}
          project={deleteTarget}
        />
      ) : null}
    </>
  );
}
